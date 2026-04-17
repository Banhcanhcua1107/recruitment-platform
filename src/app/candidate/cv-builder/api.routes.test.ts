/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const path = require("node:path");

/** @type {Array<{ input: string; init: RequestInit }>} */
const fetchCalls = [];

global.fetch = /** @type {typeof fetch} */ (async (input, init) => {
  const request = {
    input: String(input),
    init: init ?? {},
  };

  fetchCalls.push(request);

  if (request.input === "/api/cv-builder/resumes" && (!request.init.method || request.init.method === "GET")) {
    return new Response(
      JSON.stringify({
        items: [
          {
            id: "resume-1",
            title: "Resume One",
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  if (request.input === "/api/cv-builder/resumes" && request.init.method === "POST") {
    return new Response(
      JSON.stringify({
        item: {
          id: "resume-created",
          title: "Resume Created",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  if (request.input === "/api/cv-builder/resumes/resume-1" && (!request.init.method || request.init.method === "GET")) {
    return new Response(
      JSON.stringify({
        item: {
          id: "resume-1",
          title: "Resume One",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  if (request.input === "/api/cv-builder/resumes/resume-1" && request.init.method === "PATCH") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.input === "/api/cv-builder/resumes/resume-1" && request.init.method === "DELETE") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  throw new Error(`Unexpected fetch call: ${request.input}`);
});

const apiModule = require(path.join(
  process.cwd(),
  "src",
  "app",
  "candidate",
  "cv-builder",
  "route-api",
));

async function main() {
  const listResult = await apiModule.getMyResumes();
  assert.equal(listResult.length, 1);
  assert.equal(fetchCalls[0]?.input, "/api/cv-builder/resumes");
  assert.equal(fetchCalls[0]?.init?.cache, "no-store");
  assert.equal(fetchCalls[0]?.init?.credentials, "same-origin");

  const createdResume = await apiModule.createResume("template-1", "Resume Created");
  assert.equal(createdResume?.id, "resume-created");
  assert.equal(fetchCalls[1]?.input, "/api/cv-builder/resumes");
  assert.equal(fetchCalls[1]?.init?.method, "POST");
  assert.deepEqual(JSON.parse(String(fetchCalls[1]?.init?.body)), {
    templateId: "template-1",
    title: "Resume Created",
  });

  const resume = await apiModule.getResumeById("resume-1");
  assert.equal(resume?.id, "resume-1");
  assert.equal(fetchCalls[2]?.input, "/api/cv-builder/resumes/resume-1");
  assert.equal(fetchCalls[2]?.init?.cache, "no-store");
  assert.equal(fetchCalls[2]?.init?.credentials, "same-origin");

  await apiModule.saveResume("resume-1", { title: "Updated title" });
  assert.equal(fetchCalls[3]?.input, "/api/cv-builder/resumes/resume-1");
  assert.equal(fetchCalls[3]?.init?.method, "PATCH");
  assert.deepEqual(JSON.parse(String(fetchCalls[3]?.init?.body)), {
    title: "Updated title",
  });

  await apiModule.deleteResume("resume-1");
  assert.equal(fetchCalls[4]?.input, "/api/cv-builder/resumes/resume-1");
  assert.equal(fetchCalls[4]?.init?.method, "DELETE");

  console.log("candidate cv-builder api route tests passed");
}

void main();

export {};
