{{ if ({{#def.data.hasExtraNotes === true}}) { }}
{{#def.data.extraNotes}}
{{ } }}
# Major Changes ({{=it.changes.majorCount}} {{=it.pluralize('change',it.changes.majorCount)}})
{{~it.changes.major :changeGroup}}
**{{=changeGroup.key}}** ({{=changeGroup.changeCount}} {{=it.pluralize('change',changeGroup.changeCount)}})

{{~changeGroup.changes :change}}* {{=change.description}}
{{~}}{{~}}

# Minor Changes ({{=it.changes.minorCount}} {{=it.pluralize('change',it.changes.minorCount)}})
{{~it.changes.minor :changeGroup}}
**{{=changeGroup.key}}** ({{=changeGroup.changeCount}} {{=it.pluralize('change',changeGroup.changeCount)}})

{{~changeGroup.changes :change}}* {{=change.description}}
{{~}}{{~}}

# Point Changes ({{=it.changes.pointCount}} {{=it.pluralize('change',it.changes.pointCount)}})
{{~it.changes.point :changeGroup}}
**{{=changeGroup.key}}** ({{=changeGroup.changeCount}} {{=it.pluralize('change',changeGroup.changeCount)}})

{{~changeGroup.changes :change}}* {{=change.description}}
{{~}}{{~}}