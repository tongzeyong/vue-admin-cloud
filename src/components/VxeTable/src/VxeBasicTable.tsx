import { defineComponent, computed, ref, watch } from 'vue';
import { BasicTableProps } from './types';
import { basicProps } from './props';
import { ignorePropKeys } from './const';
import { basicEmits } from './emits';
import XEUtils from 'xe-utils';
import {
  VxeGridInstance,
  VxeGridEventProps,
  GridMethods,
  TableMethods,
  TableEditMethods,
  TableValidatorMethods,
  VxeUI,
  VxeGlobalThemeName,
  VxeGrid,
} from 'vxe-table';

import { extendSlots } from '@/utils/helper/tsxHelper';
import { gridComponentMethodKeys } from './methods';
import { omit ,cloneDeep} from 'lodash-es';
import { useRootSetting } from '@/hooks/setting/useRootSetting';

export default defineComponent({
  name: 'VxeBasicTable',
  props: basicProps,
  emits: basicEmits,
  setup(props, { emit, attrs }) {
    const tableElRef = ref<VxeGridInstance>();
    const emitEvents: VxeGridEventProps = {};
    const { getDarkMode } = useRootSetting();
    watch(
      () => getDarkMode.value,
      () => {
        VxeUI.setTheme(getDarkMode.value as VxeGlobalThemeName);
      },
      { immediate: true },
    );
    const extendTableMethods = (methodKeys) => {
      const funcs: any = {};
      methodKeys.forEach((name) => {
        funcs[name] = (...args: any[]) => {
          const $vxegrid: any = tableElRef.value;
          if ($vxegrid && $vxegrid[name]) {
            return $vxegrid[name](...args);
          }
        };
      });

      return funcs;
    };

    const gridExtendTableMethods = extendTableMethods(gridComponentMethodKeys) as GridMethods &
      TableMethods &
      TableEditMethods &
      TableValidatorMethods;

    basicEmits.forEach((name) => {
      const type = XEUtils.camelCase(`on-${name}`) as keyof VxeGridEventProps;

      emitEvents[type] = (...args: any[]) => emit(name, ...args);
    });

    /**
     * @description: 二次封装需要的所有属性
     *  1.部分属性需要和全局属性进行合并
     */
    const getBindValues = computed<BasicTableProps>(() => {
      /**
       * Tzy 如果是树结构不需要斑马线
       */
      const p = cloneDeep(props);
      if (props.treeConfig) {
        p['stripe'] = false;
      }
      const propsData: BasicTableProps = {
        ...attrs,
        ...p,
      };

      return propsData;
    });

    /**
     * @description: Table 所有属性
     */
    const getBindGridValues = computed(() => {
      const omitProps = omit(getBindValues.value, ignorePropKeys);

      return {
        ...omitProps,
        ...getBindGridEvent,
      };
    });

    /**
     * @description: 组件外层class
     */
    const getWrapperClass = computed(() => {
      return [attrs.class];
    });

    /**
     * @description: 重写Vxe-table 方法
     */
    const getBindGridEvent: VxeGridEventProps = {
      ...emitEvents,
    };

    return {
      getWrapperClass,
      getBindGridValues,
      tableElRef,
      ...gridExtendTableMethods,
    };
  },
  render() {
    const { tableClass, tableStyle } = this.$props;

    return (
      <div class={`h-full flex flex-col bg-white ${this.getWrapperClass}`}>
        <VxeGrid
          ref="tableElRef"
          class={`vxe-grid_scrollbar px-6 py-4 ${tableClass}`}
          style={tableStyle}
          {...this.getBindGridValues}
        >
          {extendSlots(this.$slots)}
        </VxeGrid>
      </div>
    );
  },
});
