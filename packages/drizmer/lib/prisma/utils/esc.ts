export type StringContainer = "'" | '`' | '"';

const bs = new RegExp(/\\/g);

export const escapeString = (src: string, container: StringContainer = "'") =>
	src.replace(bs, '\\\\').replace(new RegExp(container, 'g'), `\\${container}`);