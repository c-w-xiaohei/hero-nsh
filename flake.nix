{
  description = "hero-nsh toolchain: the pinned nsh release used by CI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];

      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};

      paths = import ./nix/paths.nix { lib = nixpkgs.lib; };

      testInventory = import ./nix/tests.nix {
        lib = nixpkgs.lib;
        inherit paths;
      };

      plan = import ./nix/plan.nix {
        lib = nixpkgs.lib;
        inherit (paths) componentOf;
        inherit (testInventory)
          inventory
          sharedPrefixes
          lanes
          ;
      };
    in
    {
      inherit testInventory plan;

      # CI consumes only this: `nix build .#nsh`, then puts its bin on PATH.
      # It deliberately contains no Node, pnpm, browser or desktop runtime.
      packages = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
          nsh = import ./nix/nsh.nix { inherit pkgs; };
        in
        {
          inherit nsh;
          default = nsh;
        }
      );

      formatter = forAllSystems (system: (pkgsFor system).nixfmt);
    };
}
