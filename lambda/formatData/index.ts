export const handler = async (event: any) => {
  const total: string = event.value.Order.reduce(
    (sum: any, i: any) => sum + Math.round(i.GrandTotal),
    0
  );
  const result = {
    Order: event.value,
    Customer: "test",
    Total: total,
  };
  return result;
};
