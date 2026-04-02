export function shouldLoadResumeList(templateId: string | null) {
  void templateId;
  return true;
}

export function shouldStartTemplateCreation(input: {
  templateId: string | null;
  isCreating: boolean;
  startedTemplateId: string | null;
}) {
  void input;
  return false;
}

export function shouldCreateResumeFromTemplateSelection(input: {
  templateId: string | null;
  creatingTemplateId: string | null;
}) {
  const { templateId, creatingTemplateId } = input;

  if (!templateId) {
    return false;
  }

  if (creatingTemplateId) {
    return false;
  }

  return true;
}
