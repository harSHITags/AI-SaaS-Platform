// app/api/code/route.ts

 
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";



// Define a generic message type for your frontend
type Message = {
  role: "user" | "assistant";
  content: string;
};

// Initialize the Google AI Client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

// Define the system instruction
const instructionContent =
  "You are a code generator. You must answer only in markdown code snippets. Use code comments for explanations.";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();
    let { messages } = body as { messages: Message[] };

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!process.env.GOOGLE_API_KEY) {
      return new NextResponse("Google API Key not configured", { status: 500 });
    }

    if (!messages) {
      return new NextResponse("Missing messages", { status: 400 });
    }

    

    // --- Gemini API Call Logic ---

    // 1. Prepend the system instruction to the first user message
    if (messages.length > 0 && messages[0].role === "user") {
      messages[0].content = instructionContent + "\n\n" + messages[0].content;
    }

    // 2. Convert messages to Google's format
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const latestMessage = messages[messages.length - 1];

    // 3. Make the API call
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latestMessage.content);
    const response = await result.response;
    const text = response.text();


    // 4. Format the response to match what the frontend expects
    const geminiMessage = {
      role: "assistant",
      content: text,
    };

    return NextResponse.json(geminiMessage);
  } catch (error) {
    console.log("[CODE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}