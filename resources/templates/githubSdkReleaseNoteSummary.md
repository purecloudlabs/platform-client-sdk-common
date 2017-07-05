Platform API version: {{#def.data.apiVersionData.BuildVersion}}

{{ if ({{#def.data.hasExtraNotes === true}}) { }}
{{#def.data.extraNotes}}
{{ } }}
# Changes in this version

* Major changes: {{=it.changes.majorCount}}
* Minor changes: {{=it.changes.minorCount}}
* Point changes: {{=it.changes.pointCount}}

For the full changelog, read the releaseNotes.md file in the repo.