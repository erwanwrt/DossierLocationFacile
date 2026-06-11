import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createGDriveFolder, uploadFileToGDrive } from "@/lib/google-drive";

export const maxDuration = 60; // Allow function to run up to 60 seconds (useful on Vercel for file uploads)

const FILE_KEYS = [
  "tenant_cni",
  "tenant_payslips",
  "tenant_school_cert",
  "tenant_tax_notice",
  "tenant_rent_receipts",
  "guarantor_visale",
  "guarantor_cni",
  "guarantor_payslips",
  "guarantor_tax_notice",
  "guarantor_address_proof",
  "guarantor_letter",
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 1. Extract and validate text fields
    const propertyId = formData.get("property_id") as string;
    const tenantFirstName = formData.get("tenant_first_name") as string;
    const tenantLastName = formData.get("tenant_last_name") as string;
    const tenantEmail = formData.get("tenant_email") as string;
    const tenantPhone = formData.get("tenant_phone") as string;
    const tenantSituation = formData.get("tenant_situation") as string;
    const tenantIncomeRaw = formData.get("tenant_income") as string;
    const guarantorType = formData.get("guarantor_type") as string;

    if (
      !propertyId ||
      !tenantFirstName ||
      !tenantLastName ||
      !tenantEmail ||
      !tenantPhone ||
      !tenantSituation ||
      !tenantIncomeRaw ||
      !guarantorType
    ) {
      return NextResponse.json(
        { error: "Veuillez remplir tous les champs obligatoires du formulaire." },
        { status: 400 }
      );
    }

    const tenantIncome = parseFloat(tenantIncomeRaw) || 0;

    // 2. Fetch property details
    const { data: property, error: propError } = await supabaseAdmin
      .from("properties")
      .select("id, title, gdrive_folder_id")
      .eq("id", propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json(
        { error: "Propriété introuvable." },
        { status: 404 }
      );
    }

    // 3. Resolve property Google Drive folder
    let propertyFolderId = property.gdrive_folder_id;
    if (!propertyFolderId) {
      try {
        const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        propertyFolderId = await createGDriveFolder(property.title, parentId || undefined);
        
        // Save property folder ID back to DB
        await supabaseAdmin
          .from("properties")
          .update({ gdrive_folder_id: propertyFolderId })
          .eq("id", propertyId);
      } catch (err) {
        console.error("Failed to create property folder in fallback:", err);
        return NextResponse.json(
          { error: "Erreur lors de la configuration du stockage Google Drive." },
          { status: 500 }
        );
      }
    }

    // 4. Create subfolder for this tenant submission
    // Format: "NOM Prenom - AAAA-MM-JJ"
    const dateStr = new Date().toISOString().split("T")[0];
    const tenantFolderName = `${tenantLastName.toUpperCase()} ${tenantFirstName} - ${dateStr}`;
    let tenantFolderId: string;
    try {
      tenantFolderId = await createGDriveFolder(tenantFolderName, propertyFolderId);
    } catch (err) {
      console.error("Failed to create tenant subfolder:", err);
      return NextResponse.json(
        { error: "Impossible de créer le dossier de stockage pour votre candidature." },
        { status: 500 }
      );
    }

    // 5. Upload files to Google Drive
    const filesLinks: Record<string, string> = {};

    for (const key of FILE_KEYS) {
      const file = formData.get(key) as File | null;
      
      if (file && file.size > 0 && typeof file.arrayBuffer === "function") {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          
          // Generate a clean filename: e.g. "cni.pdf" instead of long messy string, but keep extension
          const ext = file.name.split(".").pop() || "pdf";
          // We can rename files to be standardized and clean in GDrive
          const cleanFileName = `${key.replace("tenant_", "").replace("guarantor_", "")}.${ext}`;

          const uploadRes = await uploadFileToGDrive(
            buffer,
            cleanFileName,
            file.type,
            tenantFolderId
          );

          filesLinks[key] = uploadRes.webViewLink;
        } catch (uploadErr) {
          console.error(`Error uploading file ${key}:`, uploadErr);
          return NextResponse.json(
            { error: `Erreur lors de l'envoi du fichier : ${file.name}.` },
            { status: 500 }
          );
        }
      }
    }

    // 6. Insert submission data in Supabase
    const { data: submission, error: insertError } = await supabaseAdmin
      .from("submissions")
      .insert({
        property_id: propertyId,
        tenant_first_name: tenantFirstName,
        tenant_last_name: tenantLastName,
        tenant_email: tenantEmail.toLowerCase(),
        tenant_phone: tenantPhone,
        tenant_situation: tenantSituation,
        tenant_income: tenantIncome,
        guarantor_type: guarantorType,
        gdrive_folder_id: tenantFolderId,
        files: filesLinks,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert submission in DB:", insertError);
      return NextResponse.json(
        { error: "Une erreur est survenue lors de l'enregistrement de votre dossier." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
    });
  } catch (error: any) {
    console.error("Error handling submission POST:", error);
    return NextResponse.json(
      { error: "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
