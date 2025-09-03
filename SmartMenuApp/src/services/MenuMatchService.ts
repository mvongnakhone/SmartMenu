import kaggleData from '../dataset/kaggle_dishes.json';
import expectedParseData from '../dataset/expectedparse_dataset.json';
import wikiData from '../dataset/wiki_dishes.json';
import * as stringSimilarity from 'string-similarity';

// Import the ParsedItem type from TranslationService
export type ParsedItem = {
  name?: string;      // English name
  thaiName?: string;  // Thai script
  price?: number | string;
};

// Dataset item type definition
export type DatasetDish = {
  thai_name?: string;
  thai_script?: string;
  english_name?: string;
  description?: string;
  region?: string;
  image_url?: string;
  category?: string;
  source_url?: string;
};

// Enriched item type with additional information
export type EnrichedItem = {
  name?: string;
  thaiName?: string;
  price?: number | string;

  matchedThaiName: string | null;
  matchedThaiScript: string | null;
  matchedEnglishName: string | null;
  description: string | null;
  region: string | null;
  imageUrl: string | null;
  category: string | null;

  // Diagnostics
  matchSource: "kaggle" | "expectedparse" | "wiki" | null;
  matchConfidence: number; // 0..1
};

/**
 * Calculate string similarity between two strings using string-similarity library
 * Handles normalization (lowercase, trim, remove spaces/special chars) before comparison
 * Returns a value between 0 and 1
 */
function calculateSimilarity(str1: string | undefined, str2: string | undefined): number {
  if (!str1 || !str2) return 0;
  
  // Normalize both strings (lowercase, trim, remove spaces/special characters)
  const normalized1 = str1.toLowerCase().trim().replace(/[\s\-_]/g, '');
  const normalized2 = str2.toLowerCase().trim().replace(/[\s\-_]/g, '');
  
  if (normalized1 === normalized2) return 1;
  
  // Use the string-similarity library
  return stringSimilarity.compareTwoStrings(normalized1, normalized2);
}

/**
 * Find a matching dish in the specified dataset
 */
function findMatchInDataset(
  item: ParsedItem, 
  dataset: DatasetDish[],
  datasetName: "kaggle" | "expectedparse" | "wiki"
): { dish: DatasetDish | null, confidence: number, source: "kaggle" | "expectedparse" | "wiki" | null } {
  // Default return value
  const defaultResult = { dish: null, confidence: 0, source: null as "kaggle" | "expectedparse" | "wiki" | null };
  
  if (!dataset || !Array.isArray(dataset) || dataset.length === 0) {
    return defaultResult;
  }

  // Try to match by Thai name first
  if (item.thaiName) {
    for (const dish of dataset) {
      // Check against thai_script first, then thai_name
      if (dish.thai_script) {
        const confidence = calculateSimilarity(item.thaiName, dish.thai_script);
        if (confidence > 0.8) {
          return { dish, confidence, source: datasetName };
        }
      }
      
      if (dish.thai_name) {
        const confidence = calculateSimilarity(item.thaiName, dish.thai_name);
        if (confidence > 0.8) {
          return { dish, confidence, source: datasetName };
        }
      }
    }
  }

  // Fall back to English name matching
  if (item.name) {
    for (const dish of dataset) {
      if (dish.english_name) {
        const confidence = calculateSimilarity(item.name, dish.english_name);
        if (confidence > 0.6) {
          return { dish, confidence, source: datasetName };
        }
      }
    }
  }

  return defaultResult;
}

/**
 * Match and enrich menu items with additional information from datasets
 */
export function matchAndEnrichMenuItems(items: ParsedItem[]): EnrichedItem[] {
  return items.map(item => {
    // Try to find a match in each dataset in order of priority
    const kaggleMatch = findMatchInDataset(item, kaggleData as DatasetDish[], "kaggle");
    
    if (kaggleMatch.dish) {
      return createEnrichedItem(item, kaggleMatch.dish, kaggleMatch.source, kaggleMatch.confidence);
    }
    
    const expectedMatch = findMatchInDataset(item, expectedParseData as DatasetDish[], "expectedparse");
    
    if (expectedMatch.dish) {
      return createEnrichedItem(item, expectedMatch.dish, expectedMatch.source, expectedMatch.confidence);
    }
    
    const wikiMatch = findMatchInDataset(item, wikiData as DatasetDish[], "wiki");
    
    if (wikiMatch.dish) {
      return createEnrichedItem(item, wikiMatch.dish, wikiMatch.source, wikiMatch.confidence);
    }
    
    // No match found, return item with default enriched fields
    return createEnrichedItem(item, null, null, 0);
  });
}

/**
 * Helper function to create an EnrichedItem from a ParsedItem and a matched DatasetDish
 */
function createEnrichedItem(
  item: ParsedItem, 
  matchedDish: DatasetDish | null, 
  source: "kaggle" | "expectedparse" | "wiki" | null,
  confidence: number
): EnrichedItem {
  return {
    // Original fields
    name: item.name,
    thaiName: item.thaiName,
    price: item.price,
    
    // Matched fields
    matchedThaiName: matchedDish?.thai_name || null,
    matchedThaiScript: matchedDish?.thai_script || null,
    matchedEnglishName: matchedDish?.english_name || null,
    description: matchedDish?.description || null,
    region: matchedDish?.region || null,
    imageUrl: matchedDish?.image_url || null,
    category: matchedDish?.category || null,
    
    // Diagnostic fields
    matchSource: source,
    matchConfidence: confidence
  };
} 