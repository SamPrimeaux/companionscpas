import test from "node:test";
import assert from "node:assert/strict";
import { renderHomeFragment } from "../src/api/render_home_section.js";

test("newsletter renders required first name and identifies its CMS source component", async () => {
  const html = await renderHomeFragment({}, {
    id: "home_newsletter_component",
    section_key: "newsletter",
    is_visible: 1,
    heading: "Stay in the loop",
    config_json: JSON.stringify({ required_fields: ["email", "first_name"] }),
  });
  assert.ok(html.includes('name="first_name"'));
  assert.match(html, /name="first_name"[^>]*required/);
  assert.match(html, /data-component-id="home_newsletter_component"/);
  assert.match(html, /data-required-fields="email,first_name"/);
  assert.match(html, /name="email"[^>]*required/);
});

test("newsletter optional-name mode remains available for alternate embeds", async () => {
  const html = await renderHomeFragment({}, {
    section_key: "newsletter", is_visible: 1,
    config_json: JSON.stringify({ required_fields: ["email"] }),
  });
  assert.match(html, /data-required-fields="email"/);
  assert.doesNotMatch(html, /name="first_name"[^>]*required/);
});

test("newsletter escapes unsafe titles and data attributes", async () => {
  const html = await renderHomeFragment({}, {
    id: 'field_"inject"', section_key: "newsletter", is_visible: 1,
    heading: '<script>alert("x")</script>',
    config_json: '{"required_fields":["email","first_name"]}',
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /data-component-id="field_"inject"/);
});
