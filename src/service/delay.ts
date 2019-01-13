
export async function delay(ms: number) {
  // tslint:disable-next-line no-string-based-set-timeout
  return new Promise( resolve => setTimeout(resolve, ms) );
  // check here why i disable tslint https://github.com/Microsoft/tslint-microsoft-contrib/issues/355
}
