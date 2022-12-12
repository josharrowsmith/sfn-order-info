import { APIGatewayEvent } from "aws-lambda";
import https from "https";

function postRequest(
  user: string | undefined,
  hostname: string | undefined,
  key: string | undefined,
  body: object
) {
  const options = {
    method: "POST",
    hostname: hostname,
    path: "/do/WS/NetoAPI",
    headers: {
      NETOAPI_ACTION: "GetCustomer",
      NETOAPI_USERNAME: user,
      NETOAPI_KEY: key,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let rawData = "";

      res.on("data", (chunk) => {
        rawData += chunk;
      });

      res.on("end", () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (err: any) {
          reject(new Error(err));
        }
      });
    });

    req.on("error", (err: any) => {
      reject(new Error(err));
    });

    // 👇️ write the body to the Request object
    req.write(JSON.stringify(body));
    req.end();
  });
}

export const handler = async (event: APIGatewayEvent) => {
  if (!event.body) {
    return {
      status: "FAILED",
      value: undefined,
    };
  }

  const body: any = event.body;
  if (typeof body !== "object" || !body.email) {
    return {
      status: "FAILED",
      value: undefined,
    };
  }

  let email = event.body.email;

  try {
    const result: any = await postRequest(
      process.env.user,
      process.env.hostname,
      process.env.key,
      {
        Filter: {
          Email: [email],
        },
      }
    );

    return {
      status: "SUCCEED",
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      value: result.Customer[0].Username,
    };
  } catch (error) {
    console.log("Error is: 👉️", error);
    return {
      statusCode: 400,
      body: error,
      status: "FAILED",
    };
  }
};
