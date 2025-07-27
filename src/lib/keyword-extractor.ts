// src/lib/keyword-extractor.ts

export class KeywordExtractor {
  // Indonesian stopwords to exclude from keywords
  private readonly stopwords = new Set([
    'yang', 'dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'adalah', 'ini', 'itu',
    'atau', 'juga', 'akan', 'telah', 'sudah', 'ada', 'tidak', 'bisa', 'dapat', 'harus',
    'apa', 'bagaimana', 'dimana', 'kapan', 'siapa', 'kenapa', 'mengapa', 'berapa',
    'saya', 'anda', 'kita', 'mereka', 'dia', 'ia', 'nya', 'mu', 'ku',
    'sih', 'dong', 'kok', 'lah', 'kah', 'tah', 'pun', 'kan', 'dalam', 'sebagai',
    'antara', 'oleh', 'karena', 'hingga', 'sampai', 'setelah', 'sebelum', 'saat',
    'ketika', 'bila', 'jika', 'apabila', 'maka', 'sehingga', 'bahwa', 'agar',
    'supaya', 'namun', 'tetapi', 'namun', 'sedangkan', 'melainkan', 'kecuali',
    'selain', 'hanya', 'saja', 'bahkan', 'justru', 'malah', 'pula', 'lagi',
    'masih', 'belum', 'baru', 'sudah', 'pernah', 'sedang', 'tengah'
  ]);

  // Medical terms and body parts in Indonesian (prioritized for extraction)
  private readonly medicalTerms = new Set([
    // Body parts
    'kepala', 'mata', 'telinga', 'hidung', 'mulut', 'gigi', 'leher', 'tenggorokan',
    'dada', 'paru', 'jantung', 'perut', 'lambung', 'usus', 'hati', 'ginjal',
    'kandung kemih', 'tangan', 'lengan', 'kaki', 'lutut', 'siku', 'bahu',
    'punggung', 'pinggang', 'tulang', 'otot', 'kulit', 'rambut', 'kuku',

    // Symptoms
    'sakit', 'nyeri', 'pusing', 'demam', 'panas', 'dingin', 'menggigil',
    'batuk', 'pilek', 'bersin', 'sesak', 'nafas', 'mual', 'muntah',
    'diare', 'sembelit', 'konstipasi', 'gatal', 'ruam', 'bengkak',
    'kemerahan', 'luka', 'berdarah', 'memar', 'kram', 'kejang',
    'lemas', 'lelah', 'insomnia', 'tidur', 'stres', 'cemas', 'depresi',

    // Conditions
    'diabetes', 'hipertensi', 'darah tinggi', 'kolesterol', 'asma', 'alergi',
    'flu', 'masuk angin', 'tifus', 'malaria', 'tubercolosis', 'tbc',
    'hepatitis', 'gastritis', 'maag', 'infeksi', 'radang', 'tumor',
    'kanker', 'stroke', 'serangan jantung', 'aritmia', 'anemia',

    // Treatments
    'obat', 'tablet', 'kapsul', 'sirup', 'salep', 'krim', 'tetes',
    'suntik', 'vaksin', 'imunisasi', 'terapi', 'fisioterapi', 'operasi',
    'bedah', 'rawat inap', 'rawat jalan', 'kontrol', 'pemeriksaan',
    'tes darah', 'rontgen', 'usg', 'ct scan', 'mri',

    // Medical professionals
    'dokter', 'perawat', 'bidan', 'apoteker', 'terapis', 'ahli gizi',
    'spesialis', 'umum', 'anak', 'kandungan', 'bedah', 'mata', 'tht',
    'kulit', 'jiwa', 'saraf', 'orthopedi', 'urologi', 'onkologi',

    // Healthcare facilities
    'puskesmas', 'rumah sakit', 'klinik', 'apotek', 'laboratorium',
    'ugd', 'icu', 'poliklinik', 'posyandu', 'pustu'
  ]);

  // Common medical prefixes and suffixes
  private readonly medicalPrefixes = ['anti', 'pre', 'post', 'over', 'under', 'hyper', 'hypo'];
  private readonly medicalSuffixes = ['itis', 'osis', 'emia', 'uria', 'algia', 'pathy', 'ology'];

  /**
   * Extract keywords from text content
   */
  extractKeywords(text: string, maxKeywords: number = 10): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Normalize text
    const normalizedText = this.normalizeText(text);
    
    // Extract different types of keywords
    const medicalKeywords = this.extractMedicalTerms(normalizedText);
    const significantWords = this.extractSignificantWords(normalizedText);
    const phrases = this.extractPhrases(normalizedText);

    // Combine and score keywords
    const keywordScores = new Map<string, number>();

    // Add medical terms with high priority
    medicalKeywords.forEach(keyword => {
      keywordScores.set(keyword, (keywordScores.get(keyword) || 0) + 3);
    });

    // Add significant words with medium priority
    significantWords.forEach(keyword => {
      keywordScores.set(keyword, (keywordScores.get(keyword) || 0) + 2);
    });

    // Add phrases with lower priority
    phrases.forEach(keyword => {
      keywordScores.set(keyword, (keywordScores.get(keyword) || 0) + 1);
    });

    // Sort by score and return top keywords
    return Array.from(keywordScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(entry => entry[0])
      .filter(keyword => keyword.length >= 3); // Filter out very short keywords
  }

  /**
   * Extract keywords with suggestions for the user to select from
   */
  extractKeywordsWithSuggestions(text: string): {
    suggested: string[];
    additional: string[];
  } {
    const allKeywords = this.extractKeywords(text, 20);
    
    return {
      suggested: allKeywords.slice(0, 8), // Top 8 as automatic suggestions
      additional: allKeywords.slice(8, 15) // Additional 7 as optional selections
    };
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private extractMedicalTerms(text: string): string[] {
    const words = text.split(/\s+/);
    const medicalTerms: string[] = [];
    
    // Check for exact medical term matches
    for (const term of this.medicalTerms) {
      const termWords = term.split(' ');
      if (termWords.length === 1) {
        // Single word terms
        if (words.includes(term)) {
          medicalTerms.push(term);
        }
      } else {
        // Multi-word terms
        if (text.includes(term)) {
          medicalTerms.push(term);
        }
      }
    }

    // Check for terms with medical prefixes/suffixes
    words.forEach(word => {
      if (word.length >= 5) {
        const hasPrefix = this.medicalPrefixes.some(prefix => word.startsWith(prefix));
        const hasSuffix = this.medicalSuffixes.some(suffix => word.endsWith(suffix));
        
        if (hasPrefix || hasSuffix) {
          medicalTerms.push(word);
        }
      }
    });

    return [...new Set(medicalTerms)]; // Remove duplicates
  }

  private extractSignificantWords(text: string): string[] {
    const words = text.split(/\s+/);
    const wordFrequency = new Map<string, number>();

    // Count word frequencies
    words.forEach(word => {
      if (this.isSignificantWord(word)) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    });

    // Return words that appear more than once or are long enough to be significant
    return Array.from(wordFrequency.entries())
      .filter(([word, freq]) => freq > 1 || word.length >= 6)
      .map(([word]) => word)
      .slice(0, 10);
  }

  private extractPhrases(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const phrases: string[] = [];

    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/);
      
      // Extract 2-3 word phrases that might be significant
      for (let i = 0; i < words.length - 1; i++) {
        // 2-word phrases
        const phrase2 = `${words[i]} ${words[i + 1]}`;
        if (this.isSignificantPhrase(phrase2)) {
          phrases.push(phrase2);
        }

        // 3-word phrases
        if (i < words.length - 2) {
          const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (this.isSignificantPhrase(phrase3)) {
            phrases.push(phrase3);
          }
        }
      }
    });

    return [...new Set(phrases)].slice(0, 5); // Remove duplicates and limit
  }

  private isSignificantWord(word: string): boolean {
    return (
      word.length >= 4 &&
      !this.stopwords.has(word) &&
      !/^\d+$/.test(word) && // Not just numbers
      /^[a-zA-Z]+$/.test(word) // Only letters
    );
  }

  private isSignificantPhrase(phrase: string): boolean {
    const words = phrase.split(' ');
    
    // Phrase should have at least one significant word
    const hasSignificantWord = words.some(word => 
      this.isSignificantWord(word) || this.medicalTerms.has(word)
    );

    // Should not be all stopwords
    const allStopwords = words.every(word => this.stopwords.has(word));
    
    return hasSignificantWord && !allStopwords && phrase.length >= 8;
  }

  /**
   * Clean and format keywords for display
   */
  formatKeywords(keywords: string[]): string[] {
    return keywords
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length >= 3)
      .map(keyword => {
        // Capitalize first letter of each word
        return keyword.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      });
  }

  /**
   * Suggest keywords based on category
   */
  suggestKeywordsByCategory(category: string): string[] {
    const categoryKeywords: Record<string, string[]> = {
      symptoms: [
        'Sakit', 'Nyeri', 'Demam', 'Pusing', 'Mual', 'Batuk', 'Pilek', 
        'Sesak Nafas', 'Gatal', 'Bengkak', 'Lemas', 'Diare'
      ],
      conditions: [
        'Diabetes', 'Hipertensi', 'Asma', 'Alergi', 'Flu', 'Maag', 
        'Infeksi', 'Radang', 'Gastritis', 'Anemia'
      ],
      treatments: [
        'Obat', 'Terapi', 'Pemeriksaan', 'Kontrol', 'Vaksin', 'Imunisasi',
        'Fisioterapi', 'Diet', 'Istirahat', 'Kompres'
      ],
      emergency: [
        'Darurat', 'UGD', 'Pertolongan Pertama', 'Kecelakaan', 'Luka', 
        'Pendarahan', 'Pingsan', 'Sesak', 'Nyeri Dada'
      ],
      general: [
        'Kesehatan', 'Pencegahan', 'Gizi', 'Olahraga', 'Pola Hidup', 
        'Imunitas', 'Vitamin', 'Mineral'
      ]
    };

    return categoryKeywords[category] || [];
  }
}

export const keywordExtractor = new KeywordExtractor();