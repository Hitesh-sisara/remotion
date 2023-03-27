import {format, resolveConfig, resolveConfigFile} from 'prettier';

const findStarter = ({
	input,
	compositionId,
}: {
	input: string;
	compositionId: string;
}) => {
	const format1 = input.indexOf(`id="${compositionId}"`);
	if (format1 > -1) {
		return format1;
	}

	const format2 = input.indexOf(`id='${compositionId}'`);
	if (format2 > -1) {
		return format2;
	}

	const format3 = input.indexOf(`id={'${compositionId}'}`);
	if (format3 > -1) {
		return format3;
	}

	const format4 = input.indexOf(`id={"${compositionId}"}`);
	if (format4 > -1) {
		return format4;
	}

	const format5 = input.indexOf(`id={\`${compositionId}\``);
	if (format5 > -1) {
		return format5;
	}

	throw new Error(`Could not find composition ID ${compositionId} in file`);
};

const findEnder = (input: string, position: number, maxPosition: number) => {
	let currentPosition = position;
	while (currentPosition < maxPosition) {
		const next = input.indexOf('}}', currentPosition + 1);
		if (next === -1) {
			throw new Error('Could not find end of defaultProps');
		}

		currentPosition = next;

		const nextChar = input[next + 1];
		if (nextChar === ',') {
			continue;
		}

		return [position, currentPosition + 1];
	}

	throw new Error('did not find string');
};

const findTerminators = (input: string, position: number) => {
	const nextComposition = input.indexOf('<Composition', position);
	if (nextComposition > -1) {
		return nextComposition;
	}

	const nextStill = input.indexOf('<Still', position);
	if (nextStill > -1) {
		return nextStill;
	}

	return Infinity;
};

// TODO: Add more sanity checks
// TODO: better error messages
// TODO: throw if prettier was not found
export const updateDefaultProps = async ({
	input,
	compositionId,
	newDefaultProps,
}: {
	input: string;
	compositionId: string;
	newDefaultProps: unknown;
}): Promise<string> => {
	const starter = findStarter({input, compositionId});

	const START_TOKEN = 'defaultProps={';

	const start = input.indexOf(START_TOKEN, starter);
	if (start === -1) {
		throw new Error('Could not find defaultProps in <Composition> tag');
	}

	const maxEnd = findTerminators(input, starter);
	const [startPos, endPos] = findEnder(
		input,
		start + START_TOKEN.length,
		maxEnd
	);

	const newFile =
		input.substring(0, startPos) +
		JSON.stringify(newDefaultProps) +
		input.substring(endPos);

	const configFilePath = await resolveConfigFile();
	if (!configFilePath) {
		throw new Error('prettier config file not found');
	}

	const prettierConfig = await resolveConfig(configFilePath);
	if (!prettierConfig) {
		throw new Error('Prettier config not found');
	}

	const prettified = format(newFile, {
		...prettierConfig,
		rangeStart: startPos,
		rangeEnd: endPos,
		filepath: 'test.tsx',
		plugins: [],
	});
	return prettified;
};
