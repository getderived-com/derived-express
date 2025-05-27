import {
  FILTER_SEPERATOR,
  INPUT_TYPE_PLACEHOLDER,
  OPERATOR_PLACEHOLDER,
} from "./truncate-filters";

function getKeyByValue(object: any, value: string | undefined) {
  return Object.keys(object).find((key) => object[key] === value);
}

export const expandFilters = (
  filters: Record<string, string>,
  skipFilter: string[] = [],
): any[] => {
  return Object.keys(filters)
    .filter((i) => !skipFilter.includes(i))
    .map((f) => {
      const [condition, value, type] = (filters[f] || "").split(
        FILTER_SEPERATOR,
      );
      return {
        condition: getKeyByValue(OPERATOR_PLACEHOLDER, condition) || "equals",
        value: value,
        type: getKeyByValue(INPUT_TYPE_PLACEHOLDER, type) || "text",
        field: f,
      };
    });
};
