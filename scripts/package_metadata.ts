type PackageManifest = {
  bugs?: unknown;
  dependencies?: Record<string, string>;
  description?: string;
  engines?: Record<string, string>;
  homepage?: string;
  keywords?: string[];
  repository?: unknown;
  sideEffects?: boolean;
};

export const publicPackageMetadata = (
  developmentPackageJson: PackageManifest,
  generatedPackageJson: PackageManifest,
) => ({
  description: developmentPackageJson.description,
  repository: developmentPackageJson.repository,
  homepage: developmentPackageJson.homepage,
  bugs: developmentPackageJson.bugs,
  keywords: developmentPackageJson.keywords,
  sideEffects: developmentPackageJson.sideEffects,
  dependencies: {
    ...generatedPackageJson.dependencies,
    sharp: developmentPackageJson.dependencies?.sharp,
  },
  engines: developmentPackageJson.engines,
  publishConfig: { access: "public" },
});
