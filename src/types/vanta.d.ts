declare module "vanta/dist/vanta.net.min" {
  const NET: (options: Record<string, unknown>) => { destroy: () => void; setOptions: (o: Record<string, unknown>) => void };
  export default NET;
}
