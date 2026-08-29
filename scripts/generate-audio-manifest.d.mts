// Typedeklarasjon for byggskriptet slik at testene (tsconfig.app.json, uten
// allowJs) kan importere det typesikkert. Holdes i sync med .mjs-filen.
export declare const REQUIRED_CUES: readonly string[];

export declare function extractExerciseIds(exercisesDir: string): string[];

export declare function generateManifest(input: {
  audioDir: string;
  exerciseIds: string[];
}): {
  manifest: Record<string, Record<string, string>>;
  warnings: string[];
};
