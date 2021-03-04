import GameRunnerProvider from '../GameRunnerProvider';
import LoggerProvider, { LogSeverity } from '../../../ror2/logging/LoggerProvider';
import ManagerSettings from '../../../../r2mm/manager/ManagerSettings';
import R2Error from '../../../../model/errors/R2Error';
import { exec } from "child_process";
import path from "path";
import Profile from '../../../../model/Profile';
import GameDirectoryResolverProvider from '../../../ror2/game/GameDirectoryResolverProvider';
import Game from '../../../../model/game/Game';
import FsProvider from 'src/providers/generic/file/FsProvider';

export default class GameRunnerProviderImpl extends GameRunnerProvider {

    async startModded(game: Game): Promise<void | R2Error> {
        LoggerProvider.instance.Log(LogSeverity.INFO, 'Launching modded');
        // BepInEx Standard
        try {
            const corePath = path.join(Profile.getActiveProfile().getPathOfProfile(), "BepInEx", "core");
            const preloaderPath = path.join(corePath,
                (await FsProvider.instance.readdir(corePath))
                    .filter(x => ["BepInEx.Preloader.dll", "BepInEx.IL2CPP.dll"].includes(x))[0]);
            return this.start(game, `--doorstop-enable true --doorstop-target "${preloaderPath}"`);
        } catch (e) {
            const err: Error = e;
            return new R2Error("Failed to start modded", err.message, "BepInEx may not installed correctly. Further help may be required.");
        }
    }

    async startVanilla(game: Game): Promise<void | R2Error> {
            LoggerProvider.instance.Log(LogSeverity.INFO, 'Launching vanilla');
            return this.start(game, `--doorstop-enable false`);
    }

    async start(game: Game, args: string): Promise<void | R2Error> {
        return new Promise(async (resolve, reject) => {
            const settings = await ManagerSettings.getSingleton(game);
            const steamDir = await GameDirectoryResolverProvider.instance.getSteamDirectory();
            if (steamDir instanceof R2Error) {
                return steamDir;
            }

            LoggerProvider.instance.Log(LogSeverity.INFO, `Steam directory is: ${steamDir}`);
            LoggerProvider.instance.Log(LogSeverity.INFO, `Running command: ${steamDir}.exe -applaunch ${game.appId} ${args} ${settings.getContext().gameSpecific.launchParameters}`);

            exec(`"${steamDir}/Steam.exe" -applaunch ${game.appId} ${args} ${settings.getContext().gameSpecific.launchParameters}`, (err => {
                if (err !== null) {
                    LoggerProvider.instance.Log(LogSeverity.ACTION_STOPPED, 'Error was thrown whilst starting modded');
                    LoggerProvider.instance.Log(LogSeverity.ERROR, err.message);
                    const r2err = new R2Error('Error starting Steam', err.message, 'Ensure that the Steam directory has been set correctly in the settings');
                    return reject(r2err);
                }
                return resolve();
            }));
        });
    }

}
