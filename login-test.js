import http from "k6/http";
import { check, sleep } from "k6";

// Load test options
export let options = {
  vus: 100,           // 10 virtual users
  duration: "30s",   // run test for 30 seconds
  thresholds: {
    "http_req_duration": ["p(95)<500"], // 95th percentile < 500ms
  },
};

export default function () {
  const payload = JSON.stringify({
    email: "kandpaldeepak253@gmail.com",
    password: "11111111",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post("http://localhost:5000/api/users/auth/login", payload, params);

  // Check response
  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has token": (r) => r.json("token") !== undefined,
  });

  sleep(1);
}
