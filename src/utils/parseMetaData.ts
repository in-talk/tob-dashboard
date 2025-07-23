type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;

interface JSONObject {
  [key: string]: JSONValue;
}

type JSONArray = Array<JSONValue>

export function parseNestedJSON<T = unknown>(input: T): T {
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return parseNestedJSON(parsed);
    } catch {
      return input;
    }
  }

  if (Array.isArray(input)) {
    return input.map(parseNestedJSON) as T;
  }

  if (typeof input === "object" && input !== null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newObj: { [key: string]: any } = {};
    for (const key in input) {
      newObj[key] = parseNestedJSON((input as JSONObject)[key]);
    }
    return newObj as T;
  }

  return input;
}