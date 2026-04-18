declare module "pdf-parse" {
  function pdfParse(dataBuffer: Buffer, options?: object): Promise<{ text: string; numpages: number }>;
  export default pdfParse;
}
