'use server';

import { createAdminClient, createSessionClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { Query, ID, Client, Account } from "node-appwrite";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "@/constants";
import { redirect } from "next/navigation";
import { error } from "console";

// ------------------- Helpers -------------------

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  try {
    const result = await databases.listDocuments(
      appwriteConfig.databaseId as string,
      appwriteConfig.usersId as string,
      [Query.equal("email", [email])]
    );

    return result.total > 0 ? result.documents[0] : null;
  } catch (error) {
    console.error("Error getting user by email:", error);
    return null;
  }
};

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw error;
};

// ------------------- Auth Actions -------------------

/**
 * Sends an OTP to the given email address using the Admin client.
 * Returns the userId which can be used to create a session later.
 */
export const sendEmailOTP = async ({ email }: { email: string }) => {
  try {
    const { account } = await createAdminClient();

    // Create email token (this sends the OTP)
    const token = await account.createEmailToken(ID.unique(), email);
    
    console.log("Email token created:", token.userId);
    return token.userId;
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

    await databases.createDocument(
      appwriteConfig.databaseId as string,
      appwriteConfig.usersId as string,
      ID.unique(),
      {
        fullName,
        email,
        avatar: avatarPlaceholderUrl,
        accountId,
      }
    );
  }

  return parseStringify({ accountId });
};

/**
 * Verifies the OTP and creates a session.
 * The password parameter is actually the OTP code from the email.
 */
export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string; // This is the OTP code
}) => {
  try {
    const { account } = await createAdminClient();

    // Create session using the userId (accountId) and the OTP (password)
    const session = await account.createSession(accountId, password);

    // Save session cookie
    const cookieStore = await cookies();
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    console.error("Error creating session:", error);
    handleError(error, "Failed to verify OTP. Please check your code and try again.");
  }
};

// Alternative approach using client-side session creation
export const verifySecretClientSide = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}) => {
  try {
    // Create a client-side Account instance for session creation
    const client = new Client()
      .setEndpoint(appwriteConfig.endpointUrl)
      .setProject(appwriteConfig.projectId);

    const account = new Account(client);

    // Create session using client SDK
    const session = await account.createSession(accountId, password);

    // Save session cookie
    const cookieStore = await cookies();
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return parseStringify({ sessionId: session.$id });
  } catch (error) {
    console.error("Error creating session (client-side):", error);
    handleError(error, "Failed to verify OTP. Please check your code and try again.");
  }
};

// ------------------- User Actions -------------------

export const getCurrentUser = async () => {
  try {
    const { account, databases } = await createSessionClient();

    const result = await account.get();

    const user = await databases.listDocuments(
      appwriteConfig.databaseId as string,
      appwriteConfig.usersId as string,
      [Query.equal("accountId", result.$id)]
    );

    if (user.total <= 0) {
      return null;
    }

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

export const signOutUser = async () => {
  try {
    // First try to get the session client
    const { account } = await createSessionClient();
    
    // Delete the current session
    await account.deleteSession("current");
    
  } catch (error) {
    console.error("Error during session deletion:", error);
    // Continue with cookie deletion even if session deletion fails
  } finally {
    // Always delete the cookie and redirect
    try {
      const cookieStore = await cookies();
      cookieStore.delete("appwrite-session");
    } catch (cookieError) {
      console.error("Error deleting cookie:", cookieError);
    }
    
    redirect("/sign-in");
  }
};

export const signInUser = async ({ email }: { email: string }) => {
  try {
    const existingUser = await getUserByEmail(email);

    if(existingUser) {
      await sendEmailOTP({ email });
      return parseStringify({ accountId: existingUser.accountId });
    }

    return parseStringify({ accountId: null, error: "User not found" });
  } catch (error) {
    handleError(error, "Failed to sign in user");
  }
}