declare module '*.json' {
  const value: {
    exercises: any[];
    count?: number;
  };
  export default value;
}