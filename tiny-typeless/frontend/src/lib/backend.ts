export interface UsageStatistics {
    last_transcription_tokens: number;
    total_transcription_tokens: number;
}

const EMPTY_STATS: UsageStatistics = {
    last_transcription_tokens: 0,
    total_transcription_tokens: 0
};

export const getStatistics = async (): Promise<UsageStatistics> => {
    const appAPI = (window as any)?.go?.main?.App;
    if (!appAPI || typeof appAPI.GetStatistics !== 'function') {
        return EMPTY_STATS;
    }

    const rawStats = await appAPI.GetStatistics();

    return {
        last_transcription_tokens: Number(rawStats?.last_transcription_tokens ?? 0),
        total_transcription_tokens: Number(rawStats?.total_transcription_tokens ?? 0)
    };
};
