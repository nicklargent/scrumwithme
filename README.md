# scrumwith.me

No hassle planning poker at https://scrumwith.me.

Just the right set of features for quick ad-hoc estimation sessions.

 - Virtual cards
 - Mobile voting interface
 - No login necessary
 - Nothing in the way
 - QR codes

## Development

Development requires nix package manager and docker to be installed.

### Setup
```bash
git clone https://github.com/nicklargent/scrumwithme.git 
cd scrumwithme
nix-shell
npm install
```

### Run locally
```bash
grunt
```

### Build and run with Docker
```bash
grunt build
docker compose build
```