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
      NETOAPI_ACTION: "GetOrder",
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
        } catch (err) {
          reject(new Error(err));
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(err));
    });

    // 👇️ write the body to the Request object
    req.write(JSON.stringify(body));
    req.end();
  });
}

export const handler = async (event: any) => {
  let username: string = event.value;

  try {
    const result = await postRequest(
      process.env.User,
      process.env.Hostname,
      process.env.myEnvVariable,
      {
        Filter: {
          Username: username,
          OutputSelector: [
            "Email",
            "SalesChannel",
            "GrandTotal",
            "ShippingTotal",
            "OrderType",
            "OrderStatus",
            "DatePlaced",
            "DatePaid",
            "OrderLine",
            "OrderLine.ProductName",
            "OrderLine.Quantity",
            "OrderLine.UnitPrice",
          ],
        },
      }
    );

    return {
      status: "SUCCEED",
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      value: result,
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
