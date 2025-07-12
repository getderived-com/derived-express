import { PrismaClient } from "../../../generated/prisma";

export const prisma = new PrismaClient();

// Function to check if the database is connected
export const checkDBConnection = async () => {
  try {
    await prisma.$connect();
    console.log("DB connected: SQLite database");
  } catch (error) {
    console.error("Error checking DB connection:", error);
  }
}; 