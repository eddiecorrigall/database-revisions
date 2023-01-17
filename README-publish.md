Node Revisions - Publishing
==============

These are notes to publish the project to the community.

```bash
# Login to npmjs.com
npm adduser

# Bump package.json version as patch, commit change
npm version patch

# Push changes to github.com
git push
```

Check GitHub Actions for build status OK

```bash
# Delete build folder
npm run clean

# Build distribution
npm run build

# Publish to npmjs.com
npm publish
```
