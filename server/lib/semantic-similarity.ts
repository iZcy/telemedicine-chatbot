// server/lib/semantic-similarity.ts
export class SemanticSimilarityService {
  // Common Indonesian stopwords to filter out
  private readonly stopwords = new Set([
    'yang', 'dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'adalah', 'ini', 'itu',
    'atau', 'juga', 'akan', 'telah', 'sudah', 'ada', 'tidak', 'bisa', 'dapat', 'harus',
    'apa', 'bagaimana', 'dimana', 'kapan', 'siapa', 'kenapa', 'mengapa', 'berapa',
    'saya', 'anda', 'kita', 'mereka', 'dia', 'ia', 'nya', 'mu', 'ku',
    'sih', 'dong', 'kok', 'lah', 'kah', 'tah', 'pun', 'kan'
  ]);

  // Common Indonesian question markers and their variations
  private readonly questionMarkers = [
    'apa', 'bagaimana', 'dimana', 'kapan', 'siapa', 'kenapa', 'mengapa', 'berapa',
    'apakah', 'bisakah', 'dapatkah', 'haruskah', 'adakah'
  ];

  // Medical synonyms and variations for Indonesian
  private readonly medicalSynonyms: Record<string, string[]> = {
    'puskesmas': ['pusat kesehatan masyarakat', 'puskes', 'klinik desa', 'klinik pemerintah'],
    'sakit': ['penyakit', 'gangguan', 'keluhan', 'masalah kesehatan', 'nyeri'],
    'obat': ['pengobatan', 'terapi', 'medikasi', 'farmasi'],
    'dokter': ['medis', 'tenaga medis', 'petugas kesehatan'],
    'rumah sakit': ['rs', 'hospital', 'klinik besar'],
    'desa': ['kampung', 'kelurahan', 'wilayah'],
    'apa': ['apakah'],
    'dimana': ['dimanakah', 'lokasi', 'tempat', 'berada'],
    'bagaimana': ['gimana', 'cara'],
    'nyeri': ['sakit', 'pusing', 'perih'],
    'parah': ['hebat', 'berat', 'keras'],
    'anak': ['balita', 'bocah', 'kecil'],
    'demam': ['panas', 'febris']
  };

  /**
   * Calculate semantic similarity between two questions
   * Returns a score between 0 and 1, where 1 means identical meaning
   */
  calculateSimilarity(query1: string, query2: string): number {
    // Quick exact match check
    if (this.normalizeText(query1) === this.normalizeText(query2)) {
      return 1.0;
    }

    // Normalize and tokenize both queries
    const tokens1 = this.tokenizeAndNormalize(query1);
    const tokens2 = this.tokenizeAndNormalize(query2);

    // If either query is too short after normalization, use string similarity
    if (tokens1.length < 2 || tokens2.length < 2) {
      return this.calculateStringSimilarity(query1, query2);
    }

    // Calculate different similarity components
    const lexicalSim = this.calculateLexicalSimilarity(tokens1, tokens2);
    const structuralSim = this.calculateStructuralSimilarity(query1, query2);
    const semanticSim = this.calculateSemanticSimilarity(tokens1, tokens2);

    // Weighted combination of similarity scores
    const totalScore = (
      lexicalSim * 0.5 +      // Direct word overlap (increased weight)
      structuralSim * 0.2 +   // Question structure similarity 
      semanticSim * 0.3       // Synonym and concept similarity
    );

    return Math.min(totalScore, 1.0);
  }

  /**
   * Find semantically similar questions in a list
   * Returns questions that are likely duplicates
   */
  findSimilarQuestions(
    targetQuery: string, 
    existingQueries: string[], 
    threshold: number = 0.75
  ): Array<{ query: string; similarity: number }> {
    const similarities = existingQueries
      .map(query => ({
        query,
        similarity: this.calculateSimilarity(targetQuery, query)
      }))
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity);

    return similarities;
  }

  /**
   * Check if two questions are likely asking the same thing
   */
  areQuestionsEquivalent(query1: string, query2: string, threshold: number = 0.8): boolean {
    return this.calculateSimilarity(query1, query2) >= threshold;
  }

  // Private helper methods

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\?/g, '')        // Remove question marks
      .replace(/[^\w\s]/g, ' ')  // Remove punctuation
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .replace(/sih/g, '')       // Remove Indonesian filler words
      .replace(/dong/g, '')
      .replace(/kok/g, '')
      .trim();
  }

  private tokenizeAndNormalize(text: string): string[] {
    const normalized = this.normalizeText(text);
    const tokens = normalized.split(/\s+/);
    
    // Remove stopwords and very short tokens
    return tokens.filter(token => 
      token.length > 1 && 
      !this.stopwords.has(token)
    );
  }

  private calculateLexicalSimilarity(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) return 0;

    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    // Calculate Jaccard similarity
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private calculateStructuralSimilarity(query1: string, query2: string): number {
    const norm1 = this.normalizeText(query1);
    const norm2 = this.normalizeText(query2);

    // Check if both are questions
    const isQuestion1 = this.isQuestion(norm1);
    const isQuestion2 = this.isQuestion(norm2);
    
    if (isQuestion1 !== isQuestion2) {
      return 0.3; // Different structural types
    }

    // Extract question types
    const type1 = this.getQuestionType(norm1);
    const type2 = this.getQuestionType(norm2);

    if (type1 === type2 && type1 !== 'unknown') {
      return 0.8; // Same question type
    }

    // Calculate string structure similarity
    return this.calculateStringStructureSimilarity(norm1, norm2);
  }

  private calculateSemanticSimilarity(tokens1: string[], tokens2: string[]): number {
    let semanticMatches = 0;
    const maxTokens = Math.max(tokens1.length, tokens2.length);

    // Calculate best match for each token in the first set
    for (const token1 of tokens1) {
      let bestMatch = 0;
      
      for (const token2 of tokens2) {
        let matchScore = 0;
        
        // Direct match
        if (token1 === token2) {
          matchScore = 1.0;
        }
        // Synonym match
        else if (this.areSynonyms(token1, token2)) {
          matchScore = 0.9;
        }
        // Partial match (for compound words)
        else if (this.hasPartialMatch(token1, token2)) {
          matchScore = 0.6;
        }
        // String similarity for close matches
        else {
          const stringSim = this.levenshteinSimilarity(token1, token2);
          if (stringSim > 0.7) {
            matchScore = stringSim * 0.5;
          }
        }
        
        bestMatch = Math.max(bestMatch, matchScore);
      }
      
      semanticMatches += bestMatch;
    }

    // Calculate for tokens in the second set that weren't matched
    for (const token2 of tokens2) {
      let bestMatch = 0;
      
      for (const token1 of tokens1) {
        let matchScore = 0;
        
        if (token1 === token2) {
          matchScore = 1.0;
        }
        else if (this.areSynonyms(token1, token2)) {
          matchScore = 0.9;
        }
        else if (this.hasPartialMatch(token1, token2)) {
          matchScore = 0.6;
        }
        else {
          const stringSim = this.levenshteinSimilarity(token1, token2);
          if (stringSim > 0.7) {
            matchScore = stringSim * 0.5;
          }
        }
        
        bestMatch = Math.max(bestMatch, matchScore);
      }
      
      semanticMatches += bestMatch;
    }

    if (maxTokens === 0) return 0;
    return Math.min(semanticMatches / (tokens1.length + tokens2.length), 1.0);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const norm1 = this.normalizeText(str1);
    const norm2 = this.normalizeText(str2);
    
    return this.levenshteinSimilarity(norm1, norm2);
  }

  private calculateStringStructureSimilarity(str1: string, str2: string): number {
    // Calculate length similarity
    const lengthSim = 1 - Math.abs(str1.length - str2.length) / Math.max(str1.length, str2.length);
    
    // Calculate character n-gram similarity
    const ngramSim = this.calculateNGramSimilarity(str1, str2, 2);
    
    return (lengthSim * 0.3 + ngramSim * 0.7);
  }

  private isQuestion(text: string): boolean {
    return text.includes('?') || 
           this.questionMarkers.some(marker => text.includes(marker));
  }

  private getQuestionType(text: string): string {
    for (const marker of this.questionMarkers) {
      if (text.includes(marker)) {
        return marker;
      }
    }
    return 'unknown';
  }

  private areSynonyms(word1: string, word2: string): boolean {
    for (const [key, synonyms] of Object.entries(this.medicalSynonyms)) {
      const allTerms = [key, ...synonyms];
      if (allTerms.includes(word1) && allTerms.includes(word2)) {
        return true;
      }
    }
    return false;
  }

  private hasPartialMatch(word1: string, word2: string): boolean {
    const minLength = Math.min(word1.length, word2.length);
    if (minLength < 4) return false;

    // Check if one word contains the other
    return word1.includes(word2) || word2.includes(word1);
  }

  private levenshteinSimilarity(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - (matrix[str2.length][str1.length] / maxLength);
  }

  private calculateNGramSimilarity(str1: string, str2: string, n: number): number {
    const ngrams1 = this.getNGrams(str1, n);
    const ngrams2 = this.getNGrams(str2, n);

    if (ngrams1.size === 0 && ngrams2.size === 0) return 1;
    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    const intersection = new Set([...ngrams1].filter(x => ngrams2.has(x)));
    const union = new Set([...ngrams1, ...ngrams2]);

    return intersection.size / union.size;
  }

  private getNGrams(str: string, n: number): Set<string> {
    const ngrams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.add(str.slice(i, i + n));
    }
    return ngrams;
  }
}

export const semanticSimilarityService = new SemanticSimilarityService();