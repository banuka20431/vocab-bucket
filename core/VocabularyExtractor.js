export class VocabularyExtractor {
  constructor(entry) {
    this.entry = entry;
    this.audioBase = "https://media.merriam-webster.com/audio/prons/en/us/mp3/";
  }

  // Helper to strip MW tags like {bc}, {it}, etc.
  _clean(text) {
    if (!text) return "";
    return text.replace(/\{.*?\}/g, "").trim();
  }

  // 1. How to pronounce (IPA)
  getPronunciation() {
    return this.entry.hwi?.prs?.[0]?.ipa || "N/A";
  }

  // 2. Audio clip URL
  getAudioUrl() {
    const audio = this.entry.hwi?.prs?.[0]?.sound?.audio;
    if (!audio) return null;

    let subdir = audio.charAt(0);
    if (audio.startsWith("bix")) subdir = "bix";
    else if (audio.startsWith("gg")) subdir = "gg";
    else if (!/[a-zA-Z]/.test(subdir)) subdir = "number";

    return `${this.audioBase}${subdir}/${audio}.mp3`;
  }

  // 3. Category (Part of Speech)
  getCategory() {
    return this.entry.fl || "N/A";
  }

  // 4. Short Definition
  getShortDef() {
    return (
      this._clean(this.entry.shortdef?.[0]) || "No short definition available."
    );
  }

  // 5. Full Definition
  // Note: Pulls the very first primary definition from the sense sequence
  getFullDef() {
    const dt = this.entry.def?.[0]?.sseq?.[0]?.[0]?.[1]?.dt;
    const textEntry = dt?.find((item) => item[0] === "text");
    return textEntry ? this._clean(textEntry[1]) : this.getShortDef();
  }

  // 6. Usage (Example sentences)
  getUsage() {
    const dt = this.entry.def?.[0]?.sseq?.[0]?.[0]?.[1]?.dt;
    const visEntry = dt?.find((item) => item[0] === "vis");
    // Returns an array of example strings
    return visEntry ? visEntry[1].map((ex) => this._clean(ex.t)) : [];
  }

  getMetaData() {
    return {
      spelling: this.entry.meta.id.replace(/[^a-zA-Z ]/g, ""),
      pronounciation: this.getPronunciation(),
      category: this.getCategory(),
      definition: {
        full: this.getFullDef(),
        short: this.getShortDef(),
      },
      usage: this.getUsage(),
      audioURL: this.getAudioUrl(),
      timestamp: new Date().toISOString()
    };
  }
}
