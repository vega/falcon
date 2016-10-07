type Rng = [number, number];

declare type Request = {
    id: number,
    type: 'query',
    dims: {[domain: string]: {
        range: Rng,
        numBins: number
    }}
} | {
    id: number,
    type: 'range',
    dims: string[]
};

declare type Result = {
    id: number,
    type: 'query',
    data: {[dim: string]: number[]}
} | {
    type: 'range',
    id: number,
    ranges: {[dim: string]: Rng}
}
