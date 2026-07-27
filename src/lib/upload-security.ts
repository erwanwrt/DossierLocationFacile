import "server-only";

import busboy from "busboy";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 27 * 1024 * 1024;
export const MAX_FILE_COUNT = 11;

export const SUBMISSION_FILE_KEYS = [
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
] as const;

const TEXT_FIELD_KEYS = [
  "property_id",
  "tenant_first_name",
  "tenant_last_name",
  "tenant_email",
  "tenant_phone",
  "tenant_situation",
  "tenant_income",
  "guarantor_type",
  "guarantor_income",
  "tenant_comment",
] as const;

const FILE_KEY_SET = new Set<string>(SUBMISSION_FILE_KEYS);
const TEXT_FIELD_KEY_SET = new Set<string>(TEXT_FIELD_KEYS);

type AllowedMimeType = "application/pdf" | "image/jpeg" | "image/png";
type AllowedExtension = "pdf" | "jpg" | "png";

export interface SecureUploadFile {
  fieldName: string;
  buffer: Buffer;
  mimeType: AllowedMimeType;
  extension: AllowedExtension;
}

export interface ParsedSubmissionUpload {
  fields: Record<string, string>;
  files: Record<string, SecureUploadFile>;
}

export class UploadSecurityError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "UploadSecurityError";
  }
}

function detectFileType(buffer: Buffer): {
  mimeType: AllowedMimeType;
  extension: AllowedExtension;
} | null {
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
  ) {
    return { mimeType: "application/pdf", extension: "pdf" };
  }

  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  if (
    buffer.length >= pngSignature.length &&
    buffer.subarray(0, pngSignature.length).equals(pngSignature)
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  return null;
}

function normalizeOriginalExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension === "jpeg" ? "jpg" : extension;
}

function validateFile(
  fieldName: string,
  fileName: string,
  declaredMimeType: string,
  buffer: Buffer
): SecureUploadFile {
  if (buffer.length === 0) {
    throw new UploadSecurityError(
      "Les fichiers vides ne sont pas acceptés.",
      400,
      "empty_file"
    );
  }

  const detectedType = detectFileType(buffer);
  if (!detectedType) {
    throw new UploadSecurityError(
      "Seuls les fichiers PDF, JPG et PNG valides sont acceptés.",
      415,
      "unsupported_file_signature"
    );
  }

  const originalExtension = normalizeOriginalExtension(fileName);
  if (
    originalExtension !== detectedType.extension ||
    declaredMimeType !== detectedType.mimeType
  ) {
    throw new UploadSecurityError(
      "Le contenu du fichier ne correspond pas à son extension ou à son type déclaré.",
      415,
      "file_type_mismatch"
    );
  }

  return {
    fieldName,
    buffer,
    mimeType: detectedType.mimeType,
    extension: detectedType.extension,
  };
}

export async function parseSecureMultipartRequest(
  request: Request
): Promise<ParsedSubmissionUpload> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
    throw new UploadSecurityError(
      "Le formulaire doit être envoyé au format multipart/form-data.",
      415,
      "invalid_content_type"
    );
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength < 0 ||
      contentLength > MAX_REQUEST_BYTES
    ) {
      throw new UploadSecurityError(
        "La taille totale du dossier dépasse la limite autorisée de 27 Mo.",
        413,
        "request_too_large"
      );
    }
  }

  if (!request.body) {
    throw new UploadSecurityError(
      "Le corps de la requête est vide.",
      400,
      "empty_request"
    );
  }

  return await new Promise<ParsedSubmissionUpload>((resolve, reject) => {
    const fields: Record<string, string> = {};
    const files: Record<string, SecureUploadFile> = {};
    let totalFileBytes = 0;
    let settled = false;

    const parser = busboy({
      headers: {
        "content-type": contentType,
      },
      limits: {
        fieldNameSize: 100,
        fieldSize: 4 * 1024,
        fields: TEXT_FIELD_KEYS.length,
        fileSize: MAX_FILE_BYTES,
        files: MAX_FILE_COUNT,
        parts: TEXT_FIELD_KEYS.length + MAX_FILE_COUNT,
      },
    });

    const source = Readable.fromWeb(
      request.body as unknown as NodeReadableStream<Uint8Array>
    );

    const fail = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      source.unpipe(parser);
      source.destroy();
      parser.destroy();
      reject(error);
    };

    parser.on("field", (fieldName, value, info) => {
      if (!TEXT_FIELD_KEY_SET.has(fieldName)) {
        fail(
          new UploadSecurityError(
            "Le formulaire contient un champ inattendu.",
            400,
            "unexpected_field"
          )
        );
        return;
      }

      if (Object.hasOwn(fields, fieldName)) {
        fail(
          new UploadSecurityError(
            "Le formulaire contient un champ dupliqué.",
            400,
            "duplicate_field"
          )
        );
        return;
      }

      if (info.valueTruncated) {
        fail(
          new UploadSecurityError(
            "Un champ du formulaire dépasse la taille autorisée.",
            413,
            "field_too_large"
          )
        );
        return;
      }

      fields[fieldName] = value;
    });

    parser.on("file", (fieldName, fileStream, info) => {
      if (!FILE_KEY_SET.has(fieldName)) {
        fileStream.resume();
        fail(
          new UploadSecurityError(
            "Le formulaire contient un fichier inattendu.",
            400,
            "unexpected_file"
          )
        );
        return;
      }

      if (Object.hasOwn(files, fieldName)) {
        fileStream.resume();
        fail(
          new UploadSecurityError(
            "Le formulaire contient un fichier dupliqué.",
            400,
            "duplicate_file"
          )
        );
        return;
      }

      const chunks: Buffer[] = [];
      let fileBytes = 0;

      fileStream.on("limit", () => {
        fail(
          new UploadSecurityError(
            "Un fichier dépasse la limite autorisée de 5 Mo.",
            413,
            "file_too_large"
          )
        );
      });

      fileStream.on("data", (chunk: Buffer) => {
        fileBytes += chunk.length;
        totalFileBytes += chunk.length;

        if (totalFileBytes > MAX_TOTAL_FILE_BYTES) {
          fail(
            new UploadSecurityError(
              "La taille cumulée des fichiers dépasse la limite autorisée de 25 Mo.",
              413,
              "total_files_too_large"
            )
          );
          return;
        }

        chunks.push(chunk);
      });

      fileStream.on("end", () => {
        if (settled) {
          return;
        }

        try {
          const buffer = Buffer.concat(chunks, fileBytes);
          files[fieldName] = validateFile(
            fieldName,
            info.filename,
            info.mimeType,
            buffer
          );
        } catch (error) {
          fail(
            error instanceof Error
              ? error
              : new UploadSecurityError(
                  "Le fichier est invalide.",
                  400,
                  "invalid_file"
                )
          );
        }
      });
    });

    parser.on("fieldsLimit", () =>
      fail(
        new UploadSecurityError(
          "Le formulaire contient trop de champs.",
          413,
          "too_many_fields"
        )
      )
    );
    parser.on("filesLimit", () =>
      fail(
        new UploadSecurityError(
          "Le formulaire contient trop de fichiers.",
          413,
          "too_many_files"
        )
      )
    );
    parser.on("partsLimit", () =>
      fail(
        new UploadSecurityError(
          "Le formulaire contient trop d’éléments.",
          413,
          "too_many_parts"
        )
      )
    );
    parser.on("error", fail);
    source.on("error", fail);

    parser.on("close", () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ fields, files });
    });

    source.pipe(parser);
  });
}
