"use server";

import { openai } from "@ai-sdk/openai";
import { createStreamableValue } from "@ai-sdk/rsc";
import { createStreamableUI } from "@ai-sdk/rsc";
import { ModelMessage, streamText } from "ai";
import { generateText } from "ai";
import { ReactNode } from "react";
import { z } from "zod";

import { Weather } from "@/components/weather";

export interface Message {
  role: "user" | "assistant";
  content: string;
  display?: ReactNode;
}

// Streaming Chat
export async function continueTextConversation(messages: ModelMessage[]) {
  const result = await streamText({
    model: openai("gpt-5-mini"),
    messages,
  });

  const stream = createStreamableValue(result.textStream);
  return stream.value;
}

// Gen UIs
export async function continueConversation(history: Message[]) {
  const stream = createStreamableUI();

  const { text, toolResults } = await generateText({
    model: openai("gpt-5-nano"),
    system: "You are a friendly weather assistant!",
    messages: history,
    tools: {
      showWeather: {
        description: "Show the weather for a given location.",
        inputSchema: z.object({
          city: z.string().describe("The city to show the weather for."),
          unit: z
            .enum(["F", "C"])
            .describe("The unit to display the temperature in"),
        }),
        execute: async ({ city, unit }) => {
          stream.done(<Weather city={city} unit={unit} />);
          return `Here's the weather for ${city}!`;
        },
      },
    },
  });

  return {
    messages: [
      ...history,
      {
        role: "assistant" as const,
        content:
          text || toolResults.map((toolResult) => toolResult.output).join(),
        display: stream.value,
      },
    ],
  };
}

// Utils
export async function checkAIAvailability() {
  const envVarExists = !!process.env.OPENAI_API_KEY;
  return envVarExists;
}
