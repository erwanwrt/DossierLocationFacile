import "server-only";

import { Resend } from "resend";

interface SubmissionEmailData {
  submissionId: string;
  propertyId: string;
  propertyTitle: string;
  tenantFirstName: string;
  tenantLastName: string;
  tenantEmail: string;
  adminEmail: string;
}

interface RejectionEmailData {
  submissionId: string;
  propertyTitle: string;
  tenantFirstName: string;
  tenantEmail: string;
}

function getEmailClient() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) {
    throw new Error("Missing env.RESEND_API_KEY");
  }

  if (!from) {
    throw new Error("Missing env.RESEND_FROM_EMAIL");
  }

  return {
    resend: new Resend(apiKey),
    from,
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

async function sendEmail(
  payload: Parameters<Resend["emails"]["send"]>[0],
  idempotencyKey: string
) {
  const { resend } = getEmailClient();
  const { error } = await resend.emails.send(payload, { idempotencyKey });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendAdminSubmissionNotification(data: SubmissionEmailData) {
  const { from } = getEmailClient();
  const tenantName = `${data.tenantFirstName} ${data.tenantLastName}`;
  const dashboardUrl = process.env.BETTER_AUTH_URL
    ? `${process.env.BETTER_AUTH_URL.replace(/\/$/, "")}/dashboard/submissions/${data.propertyId}`
    : null;

  await sendEmail(
    {
      from,
      to: data.adminEmail,
      replyTo: data.tenantEmail,
      subject: `Nouvelle candidature — ${data.propertyTitle}`,
      text: [
        `Une nouvelle candidature a été déposée pour ${data.propertyTitle}.`,
        "",
        `Candidat : ${tenantName}`,
        `E-mail : ${data.tenantEmail}`,
        dashboardUrl ? `Consulter les candidatures : ${dashboardUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <h1>Nouvelle candidature</h1>
        <p>Une nouvelle candidature a été déposée pour <strong>${escapeHtml(data.propertyTitle)}</strong>.</p>
        <p>
          Candidat : <strong>${escapeHtml(tenantName)}</strong><br>
          E-mail : <a href="mailto:${escapeHtml(data.tenantEmail)}">${escapeHtml(data.tenantEmail)}</a>
        </p>
        ${
          dashboardUrl
            ? `<p><a href="${escapeHtml(dashboardUrl)}">Consulter les candidatures</a></p>`
            : ""
        }
      `,
    },
    `submission-admin-${data.submissionId}`
  );
}

export async function sendTenantSubmissionConfirmation(data: SubmissionEmailData) {
  const { from } = getEmailClient();

  await sendEmail(
    {
      from,
      to: data.tenantEmail,
      replyTo: data.adminEmail,
      subject: `Confirmation de votre candidature — ${data.propertyTitle}`,
      text: [
        `Bonjour ${data.tenantFirstName},`,
        "",
        `Votre dossier de candidature pour ${data.propertyTitle} a bien été déposé.`,
        "Le propriétaire va maintenant pouvoir l'étudier.",
        "",
        "Cordialement,",
        "Erwan WERTHE",
      ].join("\n"),
      html: `
        <p>Bonjour ${escapeHtml(data.tenantFirstName)},</p>
        <p>Votre dossier de candidature pour <strong>${escapeHtml(data.propertyTitle)}</strong> a bien été déposé.</p>
        <p>Le propriétaire va maintenant pouvoir l'étudier.</p>
        <p>Cordialement,<br>Erwan WERTHE</p>
      `,
    },
    `submission-tenant-${data.submissionId}`
  );
}

export async function sendTenantRejectionEmail(data: RejectionEmailData) {
  const { from } = getEmailClient();

  await sendEmail(
    {
      from,
      to: data.tenantEmail,
      subject: `Réponse à votre candidature — ${data.propertyTitle}`,
      text: [
        `Bonjour ${data.tenantFirstName},`,
        "",
        `Nous vous remercions pour votre candidature concernant ${data.propertyTitle}.`,
        "Après étude des dossiers reçus, nous sommes au regret de vous informer que votre candidature n'a pas été retenue.",
        "Nous vous souhaitons une bonne continuation dans vos recherches.",
        "",
        "Cordialement,",
        "Erwan WERTHE",
      ].join("\n"),
      html: `
        <p>Bonjour ${escapeHtml(data.tenantFirstName)},</p>
        <p>Nous vous remercions pour votre candidature concernant <strong>${escapeHtml(data.propertyTitle)}</strong>.</p>
        <p>Après étude des dossiers reçus, nous sommes au regret de vous informer que votre candidature n'a pas été retenue.</p>
        <p>Nous vous souhaitons une bonne continuation dans vos recherches.</p>
        <p>Cordialement,<br>Erwan WERTHE</p>
      `,
    },
    `submission-rejected-${data.submissionId}`
  );
}
