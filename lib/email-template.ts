export interface TemplateVars {
  body: string;
  subject: string;
  company: string;
  title: string;
  location: string;
  salary: string;
  url: string;
  from_name: string;
  from_email: string;
}

export function renderTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key as keyof TemplateVars] ?? "");
}

export const DEFAULT_EMAIL_TEMPLATE = `{{body}}`;
