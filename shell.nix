let
  pkgs = import <nixpkgs> {};
in with pkgs;
mkShell {
    name = "scrumwith.me";
    buildInputs = [
	  nodejs_20
	  coffeescript
    ];
	shellHook = ''
	  export PATH="$PWD/node_modules/.bin/:$PATH"
	'';
}
