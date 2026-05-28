import { SetMetadata, CustomDecorator } from '@nestjs/common';

// Definimos la clave que buscará nuestro futuro Guard de JWT
export const IS_PUBLIC_KEY = 'isPublic';

// Este decorador simplemente marcará la ruta con un flag de metadatos true
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);
