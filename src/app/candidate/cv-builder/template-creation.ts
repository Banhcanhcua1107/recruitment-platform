export function shouldLoadResumeList(templateId: string | null) {
  return !templateId;
}

export function shouldStartTemplateCreation(input: {
  templateId: string | null;
  isCreating: boolean;
  startedTemplateId: string | null;
}) {
  const { templateId, isCreating, startedTemplateId } = input;

  if (!templateId) {
    return false;
  }

  if (isCreating) {
    return false;
  }

  if (startedTemplateId === templateId) {
    return false;
  }

  return true;
}
