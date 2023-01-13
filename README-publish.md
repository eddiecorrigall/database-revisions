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

# IMPORTANT: assuming build pipeline completes successfully, then
# Publish to npmjs.com
npm publish --access public
```
