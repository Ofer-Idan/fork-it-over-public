const TODOIST_API_URL = "https://api.todoist.com/rest/v2";

export interface TodoistConfig {
  apiToken: string;
  projectId?: string;
}

export async function addToTodoist(
  ingredients: string[],
  config: TodoistConfig
): Promise<void> {
  const { apiToken, projectId } = config;

  if (!apiToken) {
    throw new Error("Todoist API token is required");
  }

  // Add each ingredient as a task
  for (const ingredient of ingredients) {
    const response = await fetch(`${TODOIST_API_URL}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: ingredient,
        ...(projectId && { project_id: projectId }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add item to Todoist: ${error}`);
    }
  }
}
