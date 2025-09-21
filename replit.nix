{ pkgs }: {
  deps = [
    pkgs.nodejs
    pkgs.nodePackages.typescript
    pkgs.nodePackages.ts-node
    pkgs.git
  ];
}