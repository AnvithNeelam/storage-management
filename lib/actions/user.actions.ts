'use server';

import { createAdminClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { Query, ID, Client, Account } from "node-appwrite";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  try {
    const docs = await databases.listDocuments(
      appwriteConfig.databaseId!,
      appwriteConfig.usersId!
    );
    console.log(docs);
  } catch (e) {
    console.error("Admin client test failed:", e);
  }

  const result = await databases.listDocuments(
    appwriteConfig.databaseId as string,
    appwriteConfig.usersId as string,
    [Query.equal("email", [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw error;
};

/**
 * Sends an OTP to the given email address.
 * NOTE: uses a plain Account client (no session required).
 */
export const sendEmailOTP = async ({ email }: { email: string }) => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId);

  const account = new Account(client);

  try {
    // Deprecated in Appwrite 1.x → can be replaced with createEmailSession
    const session = await account.createEmailToken(ID.unique(), email);
    return session.userId;
  } catch (error) {
    handleError(error, "Failed to send email OTP");
  }
};

export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) => {
  const existingUser = await getUserByEmail(email);

  const accountId = await sendEmailOTP({ email });
  if (!accountId) {
    throw new Error("Failed to create account");
  }

  if (!existingUser) {
    const { databases } = await createAdminClient();

    const collections = await databases.listCollections(
      appwriteConfig.databaseId!
    );
    console.log(collections);

    await databases.createDocument(
      appwriteConfig.databaseId as string,
      appwriteConfig.usersId as string,
      ID.unique(),
      {
        fullName,
        email,
        avatar:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToK4qEfbnd-RN82wdL2awn_PMviy_pelocqQ&s",
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};

export const verifySecret = async({ accountId, password}: { accountId: string; password: string }) => {
  try {
    const { account } = await createAdminClient();

    const session = await account.createSession(accountId, password);

    (await cookies()).set('appwrite-session', session.secret, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    })

    return parseStringify({ sessionId: session.$id });

  } catch (error) {
    handleError(error, "Failed to verify secret");
  }
}