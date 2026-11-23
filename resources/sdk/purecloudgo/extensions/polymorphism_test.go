package platformclientv2

// Offline tests (no org, no network) for the oneOf and discriminator models:
//   - oneOf:          AgenticVirtualAgentStructuredCondition (Rule | ConditionGroup | OutdatedSdkVersion)
//   - discriminator:  AgenticVirtualAgentEventSettings (Guardrails | Escalation | UserExit | OutdatedSdkVersion)

import (
	"encoding/json"
	"reflect"
	"testing"
)

func unmarshalCondition(t *testing.T, payload string) *Agenticvirtualagentstructuredcondition {
	t.Helper()
	var c Agenticvirtualagentstructuredcondition
	if err := json.Unmarshal([]byte(payload), &c); err != nil {
		t.Fatalf("unmarshal %s: %v", payload, err)
	}
	return &c
}

func unmarshalEventSettings(t *testing.T, payload string) *Agenticvirtualagenteventsettings {
	t.Helper()
	var e Agenticvirtualagenteventsettings
	if err := json.Unmarshal([]byte(payload), &e); err != nil {
		t.Fatalf("unmarshal %s: %v", payload, err)
	}
	return &e
}

func jsonEqual(t *testing.T, got []byte, want string) {
	t.Helper()
	var g, w interface{}
	if err := json.Unmarshal(got, &g); err != nil {
		t.Fatalf("got is not valid JSON: %s (%v)", got, err)
	}
	if err := json.Unmarshal([]byte(want), &w); err != nil {
		t.Fatalf("want is not valid JSON: %s (%v)", want, err)
	}
	if !reflect.DeepEqual(g, w) {
		t.Errorf("JSON mismatch\n got: %s\nwant: %s", got, want)
	}
}

// ---------------------------------------------------------------- oneOf

func TestOneOfRule(t *testing.T) {
	c := unmarshalCondition(t, `{"name":"age","operator":"gt","value":{"n":18}}`)
	rule, ok := c.GetAgenticvirtualagentstructuredrule()
	if !ok {
		t.Fatalf("expected Rule, got %T", c.GetActualInstance())
	}
	if *rule.Name != "age" || *rule.Operator != "gt" {
		t.Errorf("unexpected rule: %s", rule.String())
	}
}

func TestOneOfGroupWithNestedRules(t *testing.T) {
	c := unmarshalCondition(t, `{"group":"and","rules":[{"name":"a","operator":"eq"},{"group":"or","rules":[{"name":"b","operator":"eq"}]}]}`)
	group, ok := c.GetAgenticvirtualagentstructuredconditiongroup()
	if !ok {
		t.Fatalf("expected Group, got %T", c.GetActualInstance())
	}
	rules := *group.Rules
	if len(rules) != 2 {
		t.Fatalf("expected 2 nested items, got %d", len(rules))
	}
	if _, ok := rules[0].GetAgenticvirtualagentstructuredrule(); !ok {
		t.Errorf("rules[0]: expected Rule, got %T", rules[0].GetActualInstance())
	}
	if _, ok := rules[1].GetAgenticvirtualagentstructuredconditiongroup(); !ok {
		t.Errorf("rules[1]: expected Group, got %T", rules[1].GetActualInstance())
	}
}

// Bug 1: no variant matches -> fallback to the OutdatedSdkVersion class (not an empty holder).
func TestOneOfNoMatchFallsBackToOutdated(t *testing.T) {
	c := unmarshalCondition(t, `{"not":{"name":"x","operator":"eq"}}`)
	if _, ok := c.GetAgenticvirtualagentstructuredconditionoutdatedsdkversion(); !ok {
		t.Fatalf("expected OutdatedSdkVersion, got %T", c.GetActualInstance())
	}
}

// Bug 1: more than one variant matches -> fallback as well (same as Java and Python).
func TestOneOfMultipleMatchesFallsBackToOutdated(t *testing.T) {
	c := unmarshalCondition(t, `{"name":"x","operator":"eq","group":"and","rules":[]}`)
	if _, ok := c.GetAgenticvirtualagentstructuredconditionoutdatedsdkversion(); !ok {
		t.Fatalf("expected OutdatedSdkVersion, got %T", c.GetActualInstance())
	}
}

// Bug 1: an unknown item nested in a group must not leave an empty holder.
func TestOneOfUnknownNestedItemIsOutdatedNotEmpty(t *testing.T) {
	c := unmarshalCondition(t, `{"group":"and","rules":[{"not":{"name":"a","operator":"eq"}},{"name":"age","operator":"gt","value":{"n":1}}]}`)
	group, ok := c.GetAgenticvirtualagentstructuredconditiongroup()
	if !ok {
		t.Fatalf("expected Group, got %T", c.GetActualInstance())
	}
	rules := *group.Rules
	if len(rules) != 2 {
		t.Fatalf("expected 2 nested items, got %d", len(rules))
	}
	if rules[0].GetActualInstance() == nil {
		t.Fatal("rules[0] is an empty holder (GetActualInstance() == nil)")
	}
	if _, ok := rules[0].GetAgenticvirtualagentstructuredconditionoutdatedsdkversion(); !ok {
		t.Errorf("rules[0]: expected OutdatedSdkVersion, got %T", rules[0].GetActualInstance())
	}
	if _, ok := rules[1].GetAgenticvirtualagentstructuredrule(); !ok {
		t.Errorf("rules[1]: expected Rule, got %T", rules[1].GetActualInstance())
	}
}

func TestOneOfMarshalRoundTrip(t *testing.T) {
	in := `{"group":"and","rules":[{"name":"a","operator":"eq"},{"group":"or","rules":[{"name":"b","operator":"ne"}]}]}`
	c := unmarshalCondition(t, in)
	out, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	jsonEqual(t, out, in)
}

func TestOneOfSetActualInstanceRejectsWrongType(t *testing.T) {
	var c Agenticvirtualagentstructuredcondition
	if err := c.SetActualInstance("not a variant"); err == nil {
		t.Error("expected an error for an invalid type")
	}
	rule := &Agenticvirtualagentstructuredrule{}
	if err := c.SetActualInstance(rule); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}

// ------------------------------------------------------- discriminator

func TestDiscriminatorChildren(t *testing.T) {
	e := unmarshalEventSettings(t, `{"type":"Guardrails","message":"m","violationThreshold":3}`)
	g, ok := e.GetAgenticvirtualagentguardrailssettings()
	if !ok {
		t.Fatalf("expected Guardrails, got %T", e.GetActualInstance())
	}
	if *g.Message != "m" || *g.ViolationThreshold != 3 {
		t.Errorf("guardrails fields lost: %s", g.String())
	}

	e = unmarshalEventSettings(t, `{"type":"Escalation","message":"esc"}`)
	if _, ok := e.GetAgenticvirtualagentescalationeventsettings(); !ok {
		t.Errorf("expected Escalation, got %T", e.GetActualInstance())
	}

	e = unmarshalEventSettings(t, `{"type":"UserExit","message":"bye"}`)
	if _, ok := e.GetAgenticvirtualagentuserexiteventsettings(); !ok {
		t.Errorf("expected UserExit, got %T", e.GetActualInstance())
	}
}

func TestDiscriminatorUnknownTypeFallsBackToOutdated(t *testing.T) {
	e := unmarshalEventSettings(t, `{"type":"BrandNewEvent","message":"x"}`)
	o, ok := e.GetAgenticvirtualagenteventsettingsoutdatedsdkversion()
	if !ok {
		t.Fatalf("expected OutdatedSdkVersion, got %T", e.GetActualInstance())
	}
	if o.VarType == nil || *o.VarType != "BrandNewEvent" || o.Message == nil || *o.Message != "x" {
		t.Errorf("outdated class should keep type and message: %s", o.String())
	}
}

func TestDiscriminatorMissingTypeIsAnError(t *testing.T) {
	var e Agenticvirtualagenteventsettings
	if err := json.Unmarshal([]byte(`{"message":"x"}`), &e); err == nil {
		t.Error("expected an error when the discriminator property is missing")
	}
}

// Bug 2: a child built directly (no SetField) keeps all its fields, plus the stamped type.
func TestDiscriminatorChildMarshalDirectKeepsFields(t *testing.T) {
	msg, n := "hi", 3
	g := Agenticvirtualagentguardrailssettings{Message: &msg, ViolationThreshold: &n}
	out, err := json.Marshal(g)
	if err != nil {
		t.Fatal(err)
	}
	jsonEqual(t, out, `{"type":"Guardrails","message":"hi","violationThreshold":3}`)
}

// Bug 2: marshalling must not change the caller's object.
func TestDiscriminatorChildMarshalDoesNotMutateCaller(t *testing.T) {
	msg := "hi"
	g := &Agenticvirtualagentguardrailssettings{Message: &msg}
	g.SetField("Message", &msg)
	before := len(g.SetFieldNames)
	if _, err := json.Marshal(g); err != nil {
		t.Fatal(err)
	}
	if len(g.SetFieldNames) != before {
		t.Errorf("SetFieldNames was modified by MarshalJSON: %v", g.SetFieldNames)
	}
	if g.VarType != nil {
		t.Errorf("caller's VarType was modified: %v", *g.VarType)
	}
}

// PATCH mode (SetField) still sends only the fields set, plus the discriminator.
func TestDiscriminatorChildMarshalPatchMode(t *testing.T) {
	msg := "only this"
	g := &Agenticvirtualagentguardrailssettings{}
	g.SetField("Message", &msg)
	out, err := json.Marshal(g)
	if err != nil {
		t.Fatal(err)
	}
	jsonEqual(t, out, `{"type":"Guardrails","message":"only this"}`)
}

func TestDiscriminatorChildConstructor(t *testing.T) {
	out, err := json.Marshal(NewAgenticvirtualagentguardrailssettings())
	if err != nil {
		t.Fatal(err)
	}
	jsonEqual(t, out, `{"type":"Guardrails"}`)
}

func TestDiscriminatorParentMarshalRoundTrip(t *testing.T) {
	in := `{"type":"UserExit","message":"bye"}`
	e := unmarshalEventSettings(t, in)
	out, err := json.Marshal(e)
	if err != nil {
		t.Fatal(err)
	}
	jsonEqual(t, out, in)
}

// ------------------------------------------------ free-form "value" (bug 3)

// The rule "value" can be a string, number, boolean, array or object. All of them must survive unmarshal and marshal.
func TestOneOfRuleValueAnyJSONType(t *testing.T) {
	cases := map[string]string{
		"number":  `18`,
		"string":  `"gold"`,
		"boolean": `true`,
		"array":   `["a","b"]`,
		"object":  `{"n":1}`,
	}
	for name, v := range cases {
		t.Run(name, func(t *testing.T) {
			in := `{"name":"age","operator":"gt","value":` + v + `}`
			c := unmarshalCondition(t, in)
			rule, ok := c.GetAgenticvirtualagentstructuredrule()
			if !ok {
				t.Fatalf("expected Rule, got %T", c.GetActualInstance())
			}
			if rule.Value == nil {
				t.Fatalf("value %s was dropped", v)
			}
			out, err := json.Marshal(c)
			if err != nil {
				t.Fatal(err)
			}
			jsonEqual(t, out, in)
		})
	}
}

func TestOneOfRuleWithoutValue(t *testing.T) {
	c := unmarshalCondition(t, `{"name":"x","operator":"IsNull"}`)
	rule, ok := c.GetAgenticvirtualagentstructuredrule()
	if !ok {
		t.Fatalf("expected Rule, got %T", c.GetActualInstance())
	}
	if rule.Value != nil {
		t.Errorf("expected nil value, got %v", *rule.Value)
	}
}

// ------------------------------------------ unknown oneOf variant is kept (bug 4)

// An item this SDK version doesn't know must be sent back unchanged (e.g. on PATCH), not as {}.
func TestOneOfUnknownVariantIsSentBackUnchanged(t *testing.T) {
	in := `{"group":"and","rules":[{"not":{"name":"a","operator":"eq"}},{"name":"age","operator":"gt","value":18}]}`
	c := unmarshalCondition(t, in)
	out, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	jsonEqual(t, out, in)
}

func TestOneOfOutdatedStandaloneRoundTrip(t *testing.T) {
	in := `{"someNewVariant":{"x":[1,2,3]},"flag":true}`
	c := unmarshalCondition(t, in)
	if _, ok := c.GetAgenticvirtualagentstructuredconditionoutdatedsdkversion(); !ok {
		t.Fatalf("expected OutdatedSdkVersion, got %T", c.GetActualInstance())
	}
	out, err := json.Marshal(c)
	if err != nil {
		t.Fatal(err)
	}
	jsonEqual(t, out, in)
}
