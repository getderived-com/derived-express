export interface MxResponse<T> {
  data: T;
  msg: string;
}

export interface MxListResponse<T> {
  data: {
    count: number;
    rows: T[];
  };
  msg: string;
}
