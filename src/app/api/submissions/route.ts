import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createGDriveFolder, uploadFileToGDrive } from "@/lib/google-drive";
import {
  sendAdminSubmissionNotification,
  sendTenantSubmissionConfirmation,
} from "@/lib/email";
import {
  MAX_REQUEST_BYTES,
  parseSecureMultipartRequest,
  UploadSecurityError,
} from "@/lib/upload-security";
import {
  enforceSubmissionRateLimit,
  getClientIp,
} from "@/lib/submission-abuse-protection";

export const maxDuration = 60;
export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+0-9().\s-]{6,30}$/;
const TENANT_SITUATIONS = new Set(["employee", "student", "other"]);
const GUARANTOR_TYPES = new Set(["none", "visale", "physical"]);

interface SubmissionFields {
  propertyId: string;
  tenantFirstName: string;
  tenantLastName: string;
  tenantEmail: string;
  tenantPhone: string;
  tenantSituation: string;
  tenantIncome: number;
  guarantorType: string;
  guarantorIncome: number;
  tenantComment: string | null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  additionalHeaders?: HeadersInit
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...additionalHeaders,
    },
  });
}

function getRequiredTextField(
  fields: Record<string, string>,
  key: string,
  maximumLength: number
) {
  const value = fields[key]?.trim();
  if (!value || value.length > maximumLength || /[\u0000-\u001f]/.test(value)) {
    throw new UploadSecurityError(
      "Veuillez vérifier les champs obligatoires du formulaire.",
      400,
      "invalid_text_field"
    );
  }

  return value;
}

function parseMoney(value: string | undefined, required: boolean) {
  const normalized = value?.trim();
  if (!normalized && !required) {
    return 0;
  }

  if (
    !normalized ||
    !/^\d{1,7}(?:[.,]\d{1,2})?$/.test(normalized)
  ) {
    throw new UploadSecurityError(
      "Les revenus indiqués sont invalides.",
      400,
      "invalid_income"
    );
  }

  const amount = Number(normalized.replace(",", "."));
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) {
    throw new UploadSecurityError(
      "Les revenus indiqués sont invalides.",
      400,
      "invalid_income"
    );
  }

  return amount;
}

function validateSubmissionFields(
  fields: Record<string, string>
): SubmissionFields {
  const propertyId = getRequiredTextField(fields, "property_id", 36);
  const tenantFirstName = getRequiredTextField(
    fields,
    "tenant_first_name",
    100
  );
  const tenantLastName = getRequiredTextField(
    fields,
    "tenant_last_name",
    100
  );
  const tenantEmail = getRequiredTextField(fields, "tenant_email", 254)
    .toLowerCase();
  const tenantPhone = getRequiredTextField(fields, "tenant_phone", 30);
  const tenantSituation = getRequiredTextField(
    fields,
    "tenant_situation",
    20
  );
  const guarantorType = getRequiredTextField(
    fields,
    "guarantor_type",
    20
  );
  const tenantComment = fields.tenant_comment?.trim() || null;

  if (!UUID_PATTERN.test(propertyId)) {
    throw new UploadSecurityError(
      "Le bien demandé est invalide.",
      400,
      "invalid_property_id"
    );
  }

  if (!EMAIL_PATTERN.test(tenantEmail)) {
    throw new UploadSecurityError(
      "L’adresse email est invalide.",
      400,
      "invalid_email"
    );
  }

  if (!PHONE_PATTERN.test(tenantPhone)) {
    throw new UploadSecurityError(
      "Le numéro de téléphone est invalide.",
      400,
      "invalid_phone"
    );
  }

  if (!TENANT_SITUATIONS.has(tenantSituation)) {
    throw new UploadSecurityError(
      "La situation professionnelle est invalide.",
      400,
      "invalid_tenant_situation"
    );
  }

  if (!GUARANTOR_TYPES.has(guarantorType)) {
    throw new UploadSecurityError(
      "Le type de garant est invalide.",
      400,
      "invalid_guarantor_type"
    );
  }

  if (tenantComment && tenantComment.length > 2_000) {
    throw new UploadSecurityError(
      "Le commentaire dépasse la longueur autorisée.",
      400,
      "comment_too_long"
    );
  }

  return {
    propertyId,
    tenantFirstName,
    tenantLastName,
    tenantEmail,
    tenantPhone,
    tenantSituation,
    tenantIncome: parseMoney(fields.tenant_income, true),
    guarantorType,
    guarantorIncome: parseMoney(
      fields.guarantor_income,
      guarantorType === "physical"
    ),
    tenantComment,
  };
}

function rejectOversizedContentLength(request: Request) {
  const header = request.headers.get("content-length");
  if (!header) {
    return null;
  }

  const contentLength = Number(header);
  if (
    !Number.isSafeInteger(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return jsonResponse(
      { error: "La taille totale du dossier dépasse la limite autorisée de 27 Mo." },
      413
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  const oversizedResponse = rejectOversizedContentLength(request);
  if (oversizedResponse) {
    return oversizedResponse;
  }

  const clientIp =
    getClientIp(request.headers) ||
    (process.env.NODE_ENV === "production" ? null : "127.0.0.1");
  if (!clientIp) {
    return jsonResponse(
      { error: "Impossible de vérifier l’origine de la requête." },
      400
    );
  }

  try {
    const rateLimit = await enforceSubmissionRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return jsonResponse(
        {
          error:
            "Trop de tentatives ont été effectuées. Veuillez réessayer plus tard.",
        },
        429,
        {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        }
      );
    }

    const parsedUpload = await parseSecureMultipartRequest(request);
    const fields = validateSubmissionFields(parsedUpload.fields);

    const files = Object.values(parsedUpload.files);

    const { data: property, error: propertyError } = await supabaseAdmin
      .from("properties")
      .select("id, title, gdrive_folder_id, owner_id")
      .eq("id", fields.propertyId)
      .single();

    if (propertyError || !property) {
      return jsonResponse({ error: "Propriété introuvable." }, 404);
    }

    let propertyFolderId = property.gdrive_folder_id;
    if (!propertyFolderId) {
      const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      propertyFolderId = await createGDriveFolder(
        property.title,
        parentId || undefined
      );

      const { error: folderUpdateError } = await supabaseAdmin
        .from("properties")
        .update({ gdrive_folder_id: propertyFolderId })
        .eq("id", fields.propertyId);

      if (folderUpdateError) {
        throw folderUpdateError;
      }
    }

    const date = new Date().toISOString().split("T")[0];
    const tenantFolderName =
      `${fields.tenantLastName.toUpperCase()} ${fields.tenantFirstName} - ${date}`;
    const tenantFolderId = await createGDriveFolder(
      tenantFolderName,
      propertyFolderId
    );

    const fileIds: Record<string, string> = {};
    for (const file of files) {
      const baseFileName = file.fieldName
        .replace("tenant_", "")
        .replace("guarantor_", "");
      const upload = await uploadFileToGDrive(
        file.buffer,
        `${baseFileName}.${file.extension}`,
        file.mimeType,
        tenantFolderId
      );
      fileIds[file.fieldName] = upload.id;
    }

    const { data: submission, error: insertError } = await supabaseAdmin
      .from("submissions")
      .insert({
        property_id: fields.propertyId,
        tenant_first_name: fields.tenantFirstName,
        tenant_last_name: fields.tenantLastName,
        tenant_email: fields.tenantEmail,
        tenant_phone: fields.tenantPhone,
        tenant_situation: fields.tenantSituation,
        tenant_income: fields.tenantIncome,
        guarantor_type: fields.guarantorType,
        guarantor_income: fields.guarantorIncome,
        gdrive_folder_id: tenantFolderId,
        files: fileIds,
        status: "pending",
        tenant_comment: fields.tenantComment,
      })
      .select()
      .single();

    if (insertError || !submission) {
      console.error("Failed to insert submission in DB:", insertError);
      return jsonResponse(
        {
          error:
            "Une erreur est survenue lors de l’enregistrement de votre dossier.",
        },
        500
      );
    }

    const { data: owner, error: ownerError } = await supabaseAdmin
      .from("user")
      .select("email")
      .eq("id", property.owner_id)
      .single();

    if (ownerError || !owner?.email) {
      console.error("Failed to find the property owner email:", ownerError);
    } else {
      const emailData = {
        submissionId: submission.id,
        propertyId: property.id,
        propertyTitle: property.title,
        tenantFirstName: fields.tenantFirstName,
        tenantLastName: fields.tenantLastName,
        tenantEmail: fields.tenantEmail,
        adminEmail: owner.email,
      };

      const emailResults = await Promise.allSettled([
        sendAdminSubmissionNotification(emailData),
        sendTenantSubmissionConfirmation(emailData),
      ]);

      emailResults.forEach((result, index) => {
        if (result.status === "rejected") {
          const recipient = index === 0 ? "property owner" : "tenant";
          console.error(
            `Failed to send submission email to ${recipient}:`,
            result.reason
          );
        }
      });
    }

    return jsonResponse(
      {
        success: true,
        submissionId: submission.id,
      },
      200
    );
  } catch (error: unknown) {
    if (error instanceof UploadSecurityError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    console.error("Error handling submission POST:", error);
    return jsonResponse(
      { error: "Une erreur inattendue est survenue." },
      500
    );
  }
}
