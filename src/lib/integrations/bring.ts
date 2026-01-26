const BRING_API_URL = "https://api.getbring.com/rest/v2";
const BRING_RECIPES_URL = "https://api.getbring.com/rest/bringrecipes";

export interface BringConfig {
  email: string;
  password: string;
  listUuid?: string;
  recipeUrl?: string;
}

interface BringAuthResponse {
  uuid: string;
  access_token: string;
  bringListUUID: string;
}

async function authenticate(
  email: string,
  password: string
): Promise<BringAuthResponse> {
  const response = await fetch(`${BRING_API_URL}/bringauth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with Bring!");
  }

  return response.json();
}

export async function addToBring(
  ingredients: string[],
  config: BringConfig
): Promise<void> {
  const { email, password, listUuid, recipeUrl } = config;

  if (!email || !password) {
    throw new Error("Bring! email and password are required");
  }

  // Authenticate
  const auth = await authenticate(email, password);

  // Use provided list UUID or default to user's primary list
  const targetListUuid = listUuid || auth.bringListUUID;

  // Add each ingredient
  for (const ingredient of ingredients) {
    const response = await fetch(
      `${BRING_API_URL}/bringlists/${targetListUuid}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${auth.access_token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          purchase: ingredient,
          specification: "",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to add item to Bring!: ${ingredient}`);
    }
  }

  // If recipe URL provided, save it to Bring! recipes
  if (recipeUrl) {
    try {
      await saveRecipeToBring(auth.access_token, auth.uuid, targetListUuid, recipeUrl);
    } catch (error) {
      // Don't fail the whole operation if recipe save fails
      console.error("Failed to save recipe to Bring!:", error);
    }
  }
}

async function saveRecipeToBring(
  accessToken: string,
  userUuid: string,
  listUuid: string,
  recipeUrl: string
): Promise<void> {
  // First, parse the recipe URL to get Bring!'s recipe ID
  const parseResponse = await fetch(
    `${BRING_RECIPES_URL}/parser?url=${encodeURIComponent(recipeUrl)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!parseResponse.ok) {
    throw new Error("Failed to parse recipe URL");
  }

  const recipeData = await parseResponse.json();

  // Save the recipe to user's collection
  const saveResponse = await fetch(
    `${BRING_RECIPES_URL}/${userUuid}/recipes`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listUuid,
        recipeUrl,
        ...recipeData,
      }),
    }
  );

  if (!saveResponse.ok) {
    throw new Error("Failed to save recipe to Bring!");
  }
}
