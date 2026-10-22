/**
 * OpenAI function-calling tool schemas for the BuyWise research agent.
 *
 * Each tool maps to a deterministic implementation in the services layer.
 * The LLM orchestrates the workflow and writes prose; the tools return real data.
 *
 * Tool schemas follow the OpenAI `FunctionDefinition` format.
 */

import type OpenAI from 'openai';

export type ToolName =
  | 'extractRequirements'
  | 'searchProducts'
  | 'compareProducts'
  | 'analyzeReviews'
  | 'getPriceInformation'
  | 'calculateProductScore'
  | 'findAlternatives'
  | 'generateRecommendation';

export const TOOLS: OpenAI.FunctionDefinition[] = [
  {
    name: 'extractRequirements',
    description:
      'Extract structured purchase requirements from a raw user query. Returns category, budget, use cases, priorities (mapping dimension keys to importance 0-1), must-have constraints, and a confidence score.',
    parameters: {
      type: 'object',
      required: ['category', 'rawQuery', 'summary', 'budget', 'useCases', 'priorities', 'mustHave', 'niceToHave', 'confidence'],
      properties: {
        category: {
          type: 'string',
          enum: ['laptop', 'phone', 'tv', 'camera', 'headphones'],
          description: 'Detected product category.',
        },
        rawQuery: { type: 'string', description: 'The original user query verbatim.' },
        summary: { type: 'string', description: 'One concise sentence restating the user intent.' },
        budget: {
          type: 'object',
          required: ['min', 'max', 'currency'],
          properties: {
            min: { type: ['number', 'null'], description: 'Minimum budget in the currency. Null if not specified.' },
            max: { type: ['number', 'null'], description: 'Maximum budget. Null if not specified.' },
            currency: { type: 'string', enum: ['INR', 'USD', 'EUR'], default: 'INR' },
          },
        },
        useCases: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of stated use cases (e.g. "docker development", "gaming", "travel").',
        },
        priorities: {
          type: 'array',
          description: 'Dimension importance scores. Dimension keys are category-specific (e.g. performance, battery, gaming for laptops).',
          items: {
            type: 'object',
            required: ['dimension', 'importance'],
            properties: {
              dimension: { type: 'string' },
              importance: { type: 'number', minimum: 0, maximum: 1 },
            },
          },
        },
        mustHave: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hard requirements that must be satisfied, e.g. "16GB RAM", "RTX GPU".',
        },
        niceToHave: {
          type: 'array',
          items: { type: 'string' },
          description: 'Preferred but not required features.',
        },
        confidence: { type: 'number', minimum: 0, maximum: 1, description: 'Confidence in the extracted requirements.' },
      },
    },
  },
  {
    name: 'searchProducts',
    description:
      'Search for products matching the given requirements across all sources. Returns a list of canonical product IDs found.',
    parameters: {
      type: 'object',
      required: ['category'],
      properties: {
        category: { type: 'string', enum: ['laptop', 'phone', 'tv', 'camera', 'headphones'] },
        budgetMax: { type: 'number', description: 'Maximum budget filter in INR.' },
        mustHave: {
          type: 'array',
          items: { type: 'string' },
          description: 'Hard constraints to filter by.',
        },
      },
    },
  },
  {
    name: 'compareProducts',
    description:
      'Compare a set of products across key dimensions. Accepts product IDs and returns a structured comparison.',
    parameters: {
      type: 'object',
      required: ['productIds'],
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 6,
          description: 'IDs of products to compare.',
        },
      },
    },
  },
  {
    name: 'analyzeReviews',
    description:
      'Summarize review sentiment for a set of products. Returns pros, cons, average ratings, and sentiment breakdown.',
    parameters: {
      type: 'object',
      required: ['productIds'],
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Product IDs to analyze.',
        },
      },
    },
  },
  {
    name: 'getPriceInformation',
    description:
      'Get current pricing, 30-day average, 90-day range, price trend, and buy/wait recommendation for specified products.',
    parameters: {
      type: 'object',
      required: ['productIds'],
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Product IDs to get price info for.',
        },
      },
    },
  },
  {
    name: 'calculateProductScore',
    description:
      'Calculate the weighted composite score for each product given the derived weights. Returns overall score and per-dimension breakdown.',
    parameters: {
      type: 'object',
      required: ['productIds', 'category', 'weights', 'budget'],
      properties: {
        productIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Product IDs to score.',
        },
        category: { type: 'string', enum: ['laptop', 'phone', 'tv', 'camera', 'headphones'] },
        weights: {
          type: 'object',
          additionalProperties: { type: 'number' },
          description: 'Weight per dimension key.',
        },
        budget: {
          type: 'object',
          required: ['min', 'max', 'currency'],
          properties: {
            min: { type: ['number', 'null'] },
            max: { type: ['number', 'null'] },
            currency: { type: 'string' },
          },
        },
      },
    },
  },
  {
    name: 'findAlternatives',
    description:
      'Identify best-value, best-performance, best-battery, and cheapest alternatives to the winner product.',
    parameters: {
      type: 'object',
      required: ['winnerId', 'category'],
      properties: {
        winnerId: { type: 'string', description: 'Product ID of the top pick.' },
        category: { type: 'string', enum: ['laptop', 'phone', 'tv', 'camera', 'headphones'] },
      },
    },
  },
  {
    name: 'generateRecommendation',
    description:
      'Generate the final recommendation text. Given the winner product, its score, and supporting evidence, produce reasons, tradeoffs, and structured evidence items.',
    parameters: {
      type: 'object',
      required: ['productId', 'score', 'category', 'requirements'],
      properties: {
        productId: { type: 'string' },
        score: { type: 'number', description: 'Overall score 0-100.' },
        category: { type: 'string' },
        requirements: {
          type: 'object',
          description: 'The extracted Requirements object.',
        },
      },
    },
  },
];

/** The tools list formatted as OpenAI ChatCompletionTool array. */
export const OPENAI_TOOLS: OpenAI.ChatCompletionTool[] = TOOLS.map((fn) => ({
  type: 'function' as const,
  function: fn,
}));
