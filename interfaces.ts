type Rng = [number, number];

export type Request = {
    type: 'query',
    dims: {[domain: string] : {
        range: Rng,
        numBins: number
    }}
} | {
    type: 'range',
    dims: string[]
};

export type Result = {
    type: 'query',
    data: {[dim: string]: number[]}
} | {
    type: 'range',
    ranges: {[dim: string]: Rng}
}
