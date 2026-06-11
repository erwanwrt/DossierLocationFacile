"use server";

import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createGDriveFolder, deleteGDriveFile } from "@/lib/google-drive";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache"; // Next.js revalidatePath

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .trim()
    .replace(/\s+/g, "-") // replace spaces with -
    .replace(/[^\w\-]+/g, "") // remove all non-word chars
    .replace(/\-\-+/g, "-") // replace multiple - with single -
    .concat("-" + Math.random().toString(36).substring(2, 6)); // append 4 random chars
}

// Helper to authenticate owner on the server
async function getAuthOwner() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });
  
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }
  
  return session.user;
}

export async function createProperty(data: {
  title: string;
  address: string;
  description: string;
  require_guarantor: "none" | "optional" | "required";
}) {
  try {
    const owner = await getAuthOwner();
    const slug = slugify(data.title);

    // Create Google Drive folder for this property
    let gdriveFolderId: string | null = null;
    try {
      const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;
      gdriveFolderId = await createGDriveFolder(data.title, parentId || undefined);
    } catch (err) {
      console.error("Google Drive folder creation failed:", err);
      return { error: "Erreur de configuration Google Drive. Vérifiez vos variables d'environnement." };
    }

    // 1. Insert property
    const { data: property, error: propError } = await supabaseAdmin
      .from("properties")
      .insert({
        owner_id: owner.id,
        title: data.title,
        description: data.description,
        address: data.address,
        slug: slug,
        gdrive_folder_id: gdriveFolderId,
      })
      .select()
      .single();

    if (propError || !property) {
      console.error("Supabase insert property error:", propError);
      return { error: "Impossible de créer la propriété." };
    }

    // 2. Insert form config
    const { error: formError } = await supabaseAdmin
      .from("forms")
      .insert({
        property_id: property.id,
        require_guarantor: data.require_guarantor,
        is_active: true,
      });

    if (formError) {
      console.error("Supabase insert form error:", formError);
      // Rollback property
      await supabaseAdmin.from("properties").delete().eq("id", property.id);
      return { error: "Impossible de configurer le formulaire associé." };
    }

    revalidatePath("/dashboard");
    return { success: true, propertyId: property.id };
  } catch (error: any) {
    return { error: error.message === "UNAUTHORIZED" ? "Non autorisé." : "Une erreur inattendue est survenue." };
  }
}

export async function deleteProperty(propertyId: string) {
  try {
    const owner = await getAuthOwner();

    // Verify property ownership before deleting and fetch its gdrive_folder_id
    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("id, gdrive_folder_id")
      .eq("id", propertyId)
      .eq("owner_id", owner.id)
      .single();

    if (!property) {
      return { error: "Propriété introuvable ou vous n'êtes pas le propriétaire." };
    }

    // Fetch related submissions' gdrive_folder_ids
    const { data: submissions } = await supabaseAdmin
      .from("submissions")
      .select("gdrive_folder_id")
      .eq("property_id", propertyId);

    // Collect all folder IDs to delete
    const folderIdsToDelete: string[] = [];
    if (property.gdrive_folder_id) {
      folderIdsToDelete.push(property.gdrive_folder_id);
    }
    if (submissions) {
      for (const sub of submissions) {
        if (sub.gdrive_folder_id && !folderIdsToDelete.includes(sub.gdrive_folder_id)) {
          folderIdsToDelete.push(sub.gdrive_folder_id);
        }
      }
    }

    // Delete folders from Google Drive
    if (folderIdsToDelete.length > 0) {
      const deleteResults = await Promise.allSettled(
        folderIdsToDelete.map((id) => deleteGDriveFile(id))
      );

      for (let i = 0; i < deleteResults.length; i++) {
        const result = deleteResults[i];
        if (result.status === "rejected") {
          console.error(
            `Failed to delete Google Drive folder/file ${folderIdsToDelete[i]}:`,
            result.reason
          );
        }
      }
    }

    // Cascade delete is active, so forms and submissions will be deleted automatically in Supabase.
    const { error: deleteError } = await supabaseAdmin
      .from("properties")
      .delete()
      .eq("id", propertyId);

    if (deleteError) {
      console.error("Supabase delete property error:", deleteError);
      return { error: "Impossible de supprimer la propriété." };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { error: error.message === "UNAUTHORIZED" ? "Non autorisé." : "Une erreur inattendue est survenue." };
  }
}

export async function updateSubmissionStatus(submissionId: string, status: "pending" | "accepted" | "rejected") {
  try {
    const owner = await getAuthOwner();

    // Verify ownership of the property related to the submission
    const { data: submission } = await supabaseAdmin
      .from("submissions")
      .select("id, property_id, properties ( owner_id )")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return { error: "Dossier introuvable." };
    }

    // @ts-ignore
    if (submission.properties?.owner_id !== owner.id) {
      return { error: "Non autorisé." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("submissions")
      .update({ status: status })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Supabase update submission status error:", updateError);
      return { error: "Impossible de mettre à jour le statut du dossier." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/submissions/${submission.property_id}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message === "UNAUTHORIZED" ? "Non autorisé." : "Une erreur inattendue est survenue." };
  }
}

export async function toggleFormActive(propertyId: string, isActive: boolean) {
  try {
    const owner = await getAuthOwner();

    // Verify property ownership first
    const { data: property } = await supabaseAdmin
      .from("properties")
      .select("id")
      .eq("id", propertyId)
      .eq("owner_id", owner.id)
      .single();

    if (!property) {
      return { error: "Propriété introuvable ou vous n'êtes pas le propriétaire." };
    }

    // Update the form's active state
    const { error: updateError } = await supabaseAdmin
      .from("forms")
      .update({ is_active: isActive })
      .eq("property_id", propertyId);

    if (updateError) {
      console.error("Supabase update form status error:", updateError);
      return { error: "Impossible de modifier le statut du formulaire." };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { error: error.message === "UNAUTHORIZED" ? "Non autorisé." : "Une erreur inattendue est survenue." };
  }
}
