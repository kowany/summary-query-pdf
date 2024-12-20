import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validateEnvironmrequired () {
  const required = [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_INDEX_NAME',
  ];

  for (const variable in required) {
    if (!process.env[variable]) {
      throw new Error(`Missing environment variable: ${variable}`);
    }
  }
}