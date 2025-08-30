export const appwriteConfig = {
  endpointUrl: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT as string,
  projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT as string,
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE,
  usersId: process.env.NEXT_PUBLIC_APPWRITE_USERS,
  filesId: process.env.NEXT_PUBLIC_APPWRITE_FILES,
  bucketId: process.env.NEXT_PUBLIC_APPWRITE_BUCKET as string,
  secretKey: process.env.NEXT_APPWRITE_SECRET!,
};
