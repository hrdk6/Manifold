import { handleGroq } from './_groq';

export async function POST(request: Request) {
  return handleGroq(request, process.env.GROQ_API_KEY);
}

export async function GET(request: Request) {
  return handleGroq(request, process.env.GROQ_API_KEY);
}
